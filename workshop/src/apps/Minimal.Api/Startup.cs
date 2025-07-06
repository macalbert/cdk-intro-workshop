namespace M47.Workshop.Apps.Minimal.Api;

using M47.Workshop.Apps.Minimal.Api.Configurations.ApiVersion;
using M47.Workshop.Apps.Minimal.Api.Configurations.Authorization;
using M47.Workshop.Apps.Minimal.Api.Configurations.Cors;
using M47.Workshop.Apps.Minimal.Api.Configurations.Logger;
using M47.Workshop.Apps.Minimal.Api.Configurations.Swagger;
using M47.Workshop.Apps.Minimal.Api.Endpoints;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using Serilog;
using Swashbuckle.AspNetCore.SwaggerGen;
using System;
using System.Net.Mime;
using System.Text.Json;
using System.Text.Json.Serialization;

internal static class Startup
{
    public static WebApplication CreateConfigHostBuilder(string[]? args = null)
    {
        var builder = WebApplication.CreateBuilder(args!);
        var config = builder.Configuration;

        builder.Host.ConfigureLoggerOptions();

        builder.Services.ConfigureAuthorization(config);
        builder.Services.ConfigureCognitoAuthentication(config);

        builder.Services.ConfigureServices(config);

        builder.Host.UseSerilog((context, services, configuration) =>
        {
            configuration.ReadFrom.Configuration(context.Configuration)
                         .ReadFrom.Services(services)
                         .Enrich.FromLogContext()
                         .WriteTo.Console();
        });

        builder.Logging.AddAWSProvider();
        builder.Services.AddHealthChecks();

        var app = builder.Build();

        app.UseResponseCompression();

        app.UseCors();

        app.UseSwagger();
        app.UseSwaggerUI(x =>
        {
            foreach (var description in app.DescribeApiVersions())
            {
                x.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json",
                    description.GroupName);
            }
        });

        app.MapHealthChecks(ApiEndpoints.Health, new HealthCheckOptions
        {
            ResponseWriter = async (context, report) =>
            {
                context.Response.ContentType = MediaTypeNames.Application.Json;

                var response = new
                {
                    status = report.Status.ToString(),
                    dependencies = report.Entries.Select(entry => new
                    {
                        dependency = entry.Key,
                        status = entry.Value.Status.ToString(),
                        description = entry.Value.Description,
                        error = entry.Value.Exception?.Message,
                        tags = entry.Value.Tags
                    })
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                    WriteIndented = true
                }));
            },
            ResultStatusCodes =
            {
                [HealthStatus.Healthy] = StatusCodes.Status200OK,
                [HealthStatus.Degraded] = StatusCodes.Status200OK,
                [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable
            },
        });

        if (!string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase))
        {
            app.UseHttpsRedirection();
        }

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapApiEndpoints();

        app.UseSerilogRequestLogging();

        var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
        lifetime.ApplicationStopping.Register(Log.CloseAndFlush);

        return app;
    }

    internal static void ConfigureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAWSLambdaHosting(LambdaEventSource.RestApi);

        services.ConfigureApiVersion();
        services.ConfigureCors();

        services.AddTransient<IConfigureOptions<SwaggerGenOptions>, ConfigureSwaggerOptions>();

        services.AddSwaggerGen(x =>
        {
            x.DocumentFilter<TitleFilter>();
            x.OperationFilter<SwaggerDefaultValues>();
            x.SchemaFilter<EnumAsStringSchemaFilter>();
        });

        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
            options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        });

        services.Configure<Microsoft.AspNetCore.Mvc.JsonOptions>(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
            options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        });

        services.AddEndpointsApiExplorer();

        services.AddResponseCompression(options =>
        {
            options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat([MediaTypeNames.Application.Json]);
            options.EnableForHttps = true;
        });
    }

    public class TitleFilter : IDocumentFilter
    {
        public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
        {
            swaggerDoc.Info.Title = "M47 AWS CDK Workshop";
        }
    }
}
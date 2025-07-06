namespace M47.Workshop.Apps.Minimal.Api.Configurations.Swagger;

using Asp.Versioning.ApiExplorer;
using M47.Workshop.Apps.Minimal.Api.Configurations.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

public class ConfigureSwaggerOptions : IConfigureOptions<SwaggerGenOptions>
{
	private readonly IApiVersionDescriptionProvider _provider;
	private readonly IHostEnvironment _environment;

	public ConfigureSwaggerOptions(IApiVersionDescriptionProvider provider, IHostEnvironment environment)
	{
		_provider = provider;
		_environment = environment;
	}

	public void Configure(SwaggerGenOptions options)
	{
		foreach (var description in _provider.ApiVersionDescriptions)
		{
			options.SwaggerDoc(description.GroupName,
				new OpenApiInfo
				{
					Title = _environment.ApplicationName,
					Version = description.ApiVersion.ToString(),
				});
			options.DescribeAllParametersInCamelCase();
		}

		options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
		{
			Description = "ApiKey must appear in header",
			Type = SecuritySchemeType.ApiKey,
			Name = AuthConstants.ApiKeyHeaderName,
			In = ParameterLocation.Header,
		});

		options.AddSecurityRequirement(new OpenApiSecurityRequirement
		{
			{
				new()
				{
					Reference = new OpenApiReference
					{
						Type = ReferenceType.SecurityScheme,
						Id = "ApiKey"
					},
					In = ParameterLocation.Header
				},
				new List<string>()
			}
		});

		options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
		{
			In = ParameterLocation.Header,
			Description = "Please provide a valid token",
			Name = "Authorization",
			Type = SecuritySchemeType.Http,
			BearerFormat = "JWT",
			Scheme = "Bearer"
		});

		options.AddSecurityRequirement(new OpenApiSecurityRequirement
		{
			{
				new OpenApiSecurityScheme
				{
					Reference = new OpenApiReference
					{
						Type = ReferenceType.SecurityScheme,
						Id = "Bearer"
					}
				},
				Array.Empty<string>()
			}
		});
	}
}
namespace M47.Workshop.Apps.Minimal.Api.Configurations.ApiVersion;

using Asp.Versioning;

public static class ConfigureApiVersionExtension
{
	public static void ConfigureApiVersion(this IServiceCollection services)
	{
		services.AddApiVersioning(x =>
		{
			x.DefaultApiVersion = new ApiVersion(1.0);
			x.AssumeDefaultVersionWhenUnspecified = true;
			x.ReportApiVersions = true;
			x.ApiVersionReader = new MediaTypeApiVersionReader("api-version");
		}).AddApiExplorer();
	}
}
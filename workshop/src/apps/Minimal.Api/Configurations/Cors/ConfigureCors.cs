namespace M47.Workshop.Apps.Minimal.Api.Configurations.Cors;

public static class ConfigureCorsExtension
{
	public static void ConfigureCors(this IServiceCollection services)
	{
		services.AddCors(options =>
		{
			options.AddPolicy(CorsConstants.AnyOrigin, builder =>
			{
				builder.AllowAnyOrigin();
				builder.AllowAnyMethod();
				builder.AllowAnyHeader();
			});
		});
	}
}
namespace M47.Workshop.Apps.Minimal.Api.Configurations.Logger;

using Serilog;

public static class ConfigureLoggerrOptionsExtension
{
	public static void ConfigureLoggerOptions(this IHostBuilder builder)
	{
		builder.UseSerilog((context, services, configuration)
			=> configuration.ReadFrom.Configuration(context.Configuration)
							.Enrich.FromLogContext());
	}
}
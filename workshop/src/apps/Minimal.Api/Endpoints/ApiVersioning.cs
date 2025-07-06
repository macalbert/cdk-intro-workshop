namespace M47.Workshop.Apps.Minimal.Api.Endpoints;

using Asp.Versioning.Builder;
using Asp.Versioning.Conventions;

public static class ApiVersioning
{
	public static ApiVersionSet VersionSet { get; private set; } = default!;

	public static IEndpointRouteBuilder CreateApiVersionSet(this IEndpointRouteBuilder app)
	{
		VersionSet = app.NewApiVersionSet()
			.HasApiVersion(1.0)
			.ReportApiVersions()
			.Build();

		return app;
	}
}
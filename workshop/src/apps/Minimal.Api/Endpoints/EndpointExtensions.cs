namespace M47.Workshop.Apps.Minimal.Api.Endpoints;

using Greetings;

public static class EndpointExtensions
{
    public static IEndpointRouteBuilder MapApiEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGreetingsEndpoints();

        return app;
    }
}
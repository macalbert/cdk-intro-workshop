namespace M47.Workshop.Apps.Minimal.Api.Endpoints.Greetings;

using M47.Workshop.Apps.Minimal.Api;
using M47.Workshop.Apps.Minimal.Api.Configurations.Authorization;
using M47.Workshop.Apps.Minimal.Api.Configurations.Cors;

public static partial class MapEndpointsExtension
{
    public static IEndpointRouteBuilder MapGreetingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet(ApiEndpoints.Greetings.Get, GreetingsEndpoints.GetGreetingsAsync)
            .Produces(StatusCodes.Status400BadRequest)
            .RequireCors(CorsConstants.AnyOrigin)
            .RequireAuthorization(AuthConstants.UserPolicyName);

        return app;
    }
}
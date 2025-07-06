namespace M47.Workshop.Apps.Minimal.Api.Endpoints.Greetings;

using M47.Workshop.Apps.Minimal.Api.Configurations.Cors;
using Microsoft.AspNetCore.Cors;

public static class GreetingsEndpoints
{
    [EnableCors(CorsConstants.AnyOrigin)]
    internal static async Task<IResult> GetGreetingsAsync(
        ILogger<Program> logger,
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Processing GetGreetingsAsync request");

        return await Task.FromResult(Results.Ok("Hi world"));
    }
}
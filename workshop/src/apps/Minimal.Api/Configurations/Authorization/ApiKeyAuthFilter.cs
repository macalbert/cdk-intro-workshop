namespace M47.Workshop.Apps.Minimal.Api.Configurations.Authorization;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public class ApiKeyAuthFilter : IAuthorizationFilter
{
	private readonly IConfiguration _configuration;

	public ApiKeyAuthFilter(IConfiguration configuration)
	{
		_configuration = configuration;
	}

	public void OnAuthorization(AuthorizationFilterContext context)
	{
		if (context.HttpContext.Request.Headers.TryGetValue(AuthConstants.ApiKeyHeaderName, out var extractedApiKey) == false)
		{
			context.Result = new UnauthorizedObjectResult("API Key missing");
			return;
		}

		var apiKey = _configuration[AuthConstants.ApiKey]!;
		if (apiKey != extractedApiKey)
		{
			context.Result = new UnauthorizedObjectResult("Invalid API Key");
		}
	}
}
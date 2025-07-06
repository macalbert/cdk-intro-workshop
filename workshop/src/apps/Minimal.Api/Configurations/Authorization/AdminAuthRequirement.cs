namespace M47.Workshop.Apps.Minimal.Api.Configurations.Authorization;

using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;

public class AdminAuthRequirement : IAuthorizationHandler, IAuthorizationRequirement
{
	private readonly string _apiKey;

	public AdminAuthRequirement(string apiKey)
	{
		_apiKey = apiKey;
	}

	public Task HandleAsync(AuthorizationHandlerContext context)
	{
		//if (context.User.HasClaim(AuthConstants.AdminUserClainName, "true"))
		if (context.User.Identity!.IsAuthenticated)
		{
			context.Succeed(this);
			return Task.CompletedTask;
		}

		var httpContext = context.Resource as HttpContext;
		if (httpContext is null)
		{
			return Task.CompletedTask;
		}

		if (httpContext.Request.Headers.TryGetValue(AuthConstants.ApiKeyHeaderName, out var extractedApiKey) == false)
		{
			context.Fail();
			return Task.CompletedTask;
		}

		if (_apiKey != extractedApiKey)
		{
			context.Fail();
			return Task.CompletedTask;
		}

		var identity = (ClaimsIdentity)httpContext.User.Identity!;
		identity.AddClaim(new Claim("userid", Guid.Parse("02356444-2091-70db-fa23-c85faa33b392")
													.ToString()));
		context.Succeed(this);

		return Task.CompletedTask;
	}
}
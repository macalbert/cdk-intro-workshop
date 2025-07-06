namespace M47.Workshop.Apps.Minimal.Api.Configurations.Authorization;

using Amazon.CognitoIdentityProvider;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

public static class ConfigureAuthorizationExtension
{
	public static void ConfigureAuthentication(this IServiceCollection services, ConfigurationManager config)
	{
		services.AddAuthentication(x =>
		{
			x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
			x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
			x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
		}).AddJwtBearer(x =>
		{
			x.TokenValidationParameters = new TokenValidationParameters
			{
				IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)),
				ValidateIssuerSigningKey = true,
				ValidateLifetime = true,
				ValidIssuer = config["Jwt:Issuer"],
				ValidAudience = config["Jwt:Audience"],
				ValidateIssuer = true,
				ValidateAudience = true
			};
		});
	}

	public static void ConfigureCognitoAuthentication(this IServiceCollection services, ConfigurationManager config)
	{
		services.AddCognitoIdentity();
		services.AddAWSService<IAmazonCognitoIdentityProvider>();

		var cognitoIssuer = $"https://cognito-idp.{config["AWS:Region"]}.amazonaws.com/{config["AWS:UserPoolId"]}";
		var cognitoAudience = config["AWS:AppClientId"];

		services.AddAuthentication(options =>
		{
			options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
			options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
		}).AddJwtBearer(options =>
		{
			options.Authority = cognitoIssuer;
			options.TokenValidationParameters = new TokenValidationParameters
			{
				ValidateIssuer = true,
				ValidIssuer = cognitoIssuer,
				ValidateLifetime = true,
				LifetimeValidator = (before, expires, token, param) => expires > DateTime.UtcNow,
				ValidateAudience = false
			};
		});
	}

	public static void ConfigureAuthorization(this IServiceCollection services, ConfigurationManager config)
	{
		services.AddAuthorization(options =>
		{
			//options.AddPolicy(AuthConstants.AdminUserPolicyName, policy =>
			//{
			//    policy.RequireAuthenticatedUser();
			//});
			options.AddPolicy(AuthConstants.UserPolicyName, policy =>
			{
				var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
				if (environment == Environments.Production)
				{
					policy.AddRequirements(new AdminAuthRequirement(config[AuthConstants.ApiKey]!));
				}
				else
				{
					policy.RequireAssertion(a => true);
				}
			});
		});
	}
}
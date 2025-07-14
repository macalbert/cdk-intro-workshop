# Lambda API Implementation Exercise

In this exercise, we'll extend our existing Minimal API with a new endpoint and deploy it using CDK.

## Step 1: Create a New API Endpoint

Create a new file in the `Endpoints` folder called `WeatherEndpoint.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using System;

namespace M47.Workshop.Apps.Minimal.Api.Endpoints;

public static class WeatherEndpoint
{
    public static void MapWeatherEndpoint(this WebApplication app)
    {
        app.MapGet("/weather", GetWeatherForecast)
           .WithName("GetWeatherForecast")
           .WithDescription("Gets a weather forecast")
           .WithOpenApi();
    }

    private static IResult GetWeatherForecast()
    {
        var forecast = new[]
        {
            new WeatherForecast(DateTime.Now.AddDays(1), 20, "Sunny"),
            new WeatherForecast(DateTime.Now.AddDays(2), 22, "Partly Cloudy"),
            new WeatherForecast(DateTime.Now.AddDays(3), 18, "Rainy"),
            new WeatherForecast(DateTime.Now.AddDays(4), 15, "Stormy"),
            new WeatherForecast(DateTime.Now.AddDays(5), 21, "Clear")
        };
        
        return Results.Ok(forecast);
    }
}

public record WeatherForecast(DateTime Date, double TemperatureC, string Summary)
{
    public double TemperatureF => 32 + (TemperatureC / 0.5556);
}
```

## Step 2: Update the API Endpoints Registry

Add the new endpoint to `ApiEndpoints.cs`:

```csharp
namespace M47.Workshop.Apps.Minimal.Api.Endpoints;

public static class ApiEndpoints
{
    public const string Health = "/health";
    public const string Hello = "/hello";
    public const string Weather = "/weather";  // New endpoint
}
```

## Step 3: Register the Endpoint in Startup.cs

Add the endpoint mapping to `Startup.cs` in the configuration section:

```csharp
// In Startup.cs ConfigureServices method
app.MapHealthChecks(ApiEndpoints.Health, new HealthCheckOptions { /* ... */ });

// Add the new weather endpoint
app.MapWeatherEndpoint();

// Configure authorization if needed
app.UseAuthentication();
app.UseAuthorization();
```

## Step 4: Deploy Using CDK

Deploy your changes to AWS using CDK:

```bash
# Navigate to the IAC folder
cd workshop/src/iac

# Deploy the Lambda function with your new endpoint
cdk deploy m47-cdk-intro-workshop-apilambda-production-stack

# You don't need to redeploy the API Gateway unless you've changed the configuration
```

## Step 5: Test Your New Endpoint

Once deployed, test your new endpoint:

```bash
# Test the new endpoint
curl -v https://api-cdk-workshop.m47.io/weather

# Expected result: JSON array with weather forecasts
```

## Bonus Challenge

1. Add query parameters to filter the weather forecast by day
2. Add an endpoint to get weather for a specific location
3. Implement error handling with appropriate HTTP status codes

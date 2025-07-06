using M47.Workshop.Apps.Minimal.Api;

var app = Startup.CreateConfigHostBuilder(args);

app.Run();

// Run the following commands to set up HTTPS development certificates:
//dotnet dev-certs https
//dotnet dev-certs https --trust
#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["workshop/src/apps/Minimal.Api/Minimal.Api.csproj", "workshop/src/apps/Minimal.Api/"]
COPY ["workshop/src/workshop/workshop.csproj", "workshop/src/workshop/"]
COPY ["shared/src/Backend/Shared.csproj", "shared/src/Backend/"]
COPY ["Directory.Packages.props","."]
RUN dotnet restore "workshop/src/apps/Minimal.Api/Minimal.Api.csproj"
COPY . .
WORKDIR "/src/workshop/src/apps/Minimal.Api"
RUN dotnet build "Minimal.Api.csproj" -c Release -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
RUN dotnet publish "Minimal.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish \
    /p:UseAppHost=false /p:PublishReadyToRun=true

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "M47.workshop.Apps.Minimal.Api.dll"]
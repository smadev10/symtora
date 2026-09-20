# Build context: ./backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first, on just the project files, so this layer caches across code-only changes.
COPY Symtora.sln .
COPY src/Symtora.Api/Symtora.Api.csproj src/Symtora.Api/
RUN dotnet restore src/Symtora.Api/Symtora.Api.csproj

COPY src/Symtora.Api/ src/Symtora.Api/
RUN dotnet publish src/Symtora.Api/Symtora.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Symtora.Api.dll"]

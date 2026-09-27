using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Symtora.Api.Data;
using Symtora.Api.Models;
using Symtora.Api.Options;
using Symtora.Api.Services.Analysis;
using Symtora.Api.Services.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<OllamaOptions>(builder.Configuration.GetSection(OllamaOptions.SectionName));

builder.Services.AddDbContext<SymtoraDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddSingleton<IEntryAnalysisQueue, EntryAnalysisQueue>();
builder.Services.AddHostedService<EntryAnalysisWorker>();
builder.Services.AddHttpClient<IOllamaClient, OllamaClient>((sp, client) =>
{
    var ollama = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<OllamaOptions>>().Value;
    client.BaseAddress = new Uri(ollama.BaseUrl);
    client.Timeout = TimeSpan.FromMinutes(2); // local CPU inference can be slow
});

// Expo web (`npx expo start --web`) serves the app from localhost:8081, a different origin than
// the API, so the browser needs CORS headers. Native builds don't do CORS, and the deployed stack
// has no web client yet, so this stays development-only.
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins("http://localhost:8081")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers();

// .NET 10 generates the OpenAPI document but says nothing about authentication on its own, so the
// bearer scheme is declared by hand — without it the API reference has no Authorize field and every
// [Authorize] endpoint just answers 401 when tried from the UI.
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[JwtBearerDefaults.AuthenticationScheme] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            In = ParameterLocation.Header,
            Scheme = "bearer",
            BearerFormat = "JWT",
        };

        return Task.CompletedTask;
    });

    // Attached per operation rather than globally so /auth/register, /auth/login and /health aren't
    // shown as requiring a token they don't need.
    options.AddOperationTransformer((operation, context, _) =>
    {
        if (context.Description.ActionDescriptor.EndpointMetadata.OfType<IAuthorizeData>().Any())
        {
            operation.Security ??= [];
            operation.Security.Add(new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, context.Document)] = [],
            });
        }

        return Task.CompletedTask;
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // Before the redirect, so the browser's preflight is answered rather than 307'd — a
    // redirected preflight is rejected outright.
    app.UseCors();

    // Local `dotnet run` exposes both an http (5014) and an https (7135) endpoint via
    // launchSettings, using the standard `dotnet dev-certs https --trust` dev certificate.
    // Redirecting here means a password (hashed client-side or not) never leaves the
    // machine in the clear during local testing. The docker-compose/production stack
    // still serves plain HTTP on 8080 with no certificate configured at all — enabling
    // this there needs a real reverse-proxy/TLS setup first, so it's deliberately left
    // alone rather than redirecting to a port nothing is listening on.
    app.UseHttpsRedirection();
}

// On by default while developing; the deployed stack opts in with OpenApi__Enabled=true instead of
// needing a rebuild (see EXPOSE_API_DOCS in .env.example).
if (builder.Configuration.GetValue("OpenApi:Enabled", builder.Environment.IsDevelopment()))
{
    app.MapOpenApi();
    app.MapScalarApiReference(options => options
        .WithTitle("Symtora API")
        .AddPreferredSecuritySchemes(JwtBearerDefaults.AuthenticationScheme));
}

await MigrateDatabaseAsync(app);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .WithSummary("Liveness check.")
    .WithDescription("Answers 200 as soon as the API is serving. Says nothing about the database or the model — it is what the container orchestrator polls, not a readiness probe.");

app.Run();

// The `db` container may not accept connections yet when `api` starts, so retry briefly instead
// of crashing the whole container on a race at startup — docker-compose starts services roughly
// in parallel, `depends_on` only waits for the container to start, not for Postgres to be ready.
static async Task MigrateDatabaseAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<SymtoraDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    const int maxAttempts = 10;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            await db.Database.MigrateAsync();
            return;
        }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            logger.LogWarning(ex, "Database not ready yet (attempt {Attempt}/{Max}), retrying...", attempt, maxAttempts);
            await Task.Delay(TimeSpan.FromSeconds(3));
        }
    }
}

public partial class Program;

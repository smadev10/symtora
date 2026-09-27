using System.ComponentModel.DataAnnotations;

namespace Symtora.Api.Dtos;

// The app hashes the password on-device (SHA-256) before it ever reaches the API, so
// `Password` here is always a 64-character lowercase hex digest, not the user's real
// password — the minimum-length rule that used to apply to the real password now lives
// client-side, since every hash is the same fixed length regardless of input.
public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Password must be a SHA-256 hash.")] string Password);

public record LoginRequest(
    [Required] string Email,
    [Required, RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Password must be a SHA-256 hash.")] string Password);

public record AuthResponse(string Token, DateTimeOffset ExpiresAt);

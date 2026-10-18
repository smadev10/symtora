using System.ComponentModel.DataAnnotations;

using Symtora.Api.Models;

namespace Symtora.Api.Dtos;

// The app hashes the password on-device (SHA-256) before it ever reaches the API, so
// `Password` here is always a 64-character lowercase hex digest, not the user's real
// password — the minimum-length rule that used to apply to the real password now lives
// client-side, since every hash is the same fixed length regardless of input.
public record RegisterRequest(
    [Required, StringLength(User.NameMaxLength)] string Name,
    [Required, EmailAddress] string Email,
    [Required, RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Password must be a SHA-256 hash.")] string Password);

public record LoginRequest(
    [Required] string Email,
    [Required, RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Password must be a SHA-256 hash.")] string Password);

public record ChangePasswordRequest(
    [Required, RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Password must be a SHA-256 hash.")] string CurrentPassword,
    [Required, RegularExpression("^[0-9a-f]{64}$", ErrorMessage = "Password must be a SHA-256 hash.")] string NewPassword);

// `Name` is the display name given at registration, so a fresh device can greet the user
// without a separate profile call.
public record AuthResponse(string Token, DateTimeOffset ExpiresAt, string Name);

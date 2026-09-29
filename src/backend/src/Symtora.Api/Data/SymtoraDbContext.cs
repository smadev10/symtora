using Microsoft.EntityFrameworkCore;
using Symtora.Api.Models;

namespace Symtora.Api.Data;

public class SymtoraDbContext(DbContextOptions<SymtoraDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<SymptomEntry> Entries => Set<SymptomEntry>();
    public DbSet<Assessment> Assessments => Set<Assessment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.Name).HasMaxLength(User.NameMaxLength);
        });

        modelBuilder.Entity<SymptomEntry>(b =>
        {
            b.Property(e => e.Status).HasConversion<string>();
            b.Property(e => e.Language)
                .HasMaxLength(SymptomEntry.LanguageMaxLength)
                .HasDefaultValue(SymptomEntry.DefaultLanguage);
            b.HasOne(e => e.User)
                .WithMany(u => u.Entries)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Assessment>(b =>
        {
            b.HasOne(a => a.Entry)
                .WithOne(e => e.Assessment)
                .HasForeignKey<Assessment>(a => a.EntryId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

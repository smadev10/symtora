using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Symtora.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEntryLanguage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "Entries",
                type: "character varying(2)",
                maxLength: 2,
                nullable: false,
                defaultValue: "de");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Language",
                table: "Entries");
        }
    }
}

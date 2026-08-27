import click

from app import create_app
from app.models.user import UserRole
from app.services.auth_service import AuthService
from app.services.exceptions import ServiceError

app = create_app()


@app.cli.command("create-admin")
@click.option("--username", default="admin", prompt="Admin username", help="Admin username")
@click.option("--email", default="admin@ajali.go.ke", prompt="Admin email", help="Admin email")
@click.option(
    "--password",
    prompt="Admin password",
    hide_input=True,
    confirmation_prompt=True,
    help="Admin password (min 8 chars)",
)
def create_admin(username, email, password):
    """Create an administrator account with admin role."""
    try:
        user = AuthService.register_user(
            username=username,
            email=email,
            password=password,
            role=UserRole.ADMIN,
        )
        click.secho(f" Admin user created successfully: {user.username} ({user.email})", fg="green")
    except ServiceError as err:
        click.secho(f" Error creating admin: {err.message}", fg="red")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

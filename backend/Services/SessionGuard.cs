using System.Security.Claims;

namespace PremsCart.Services;

// Browser tabs share a cookie. Stop a stale tab from acting as a different account.
public static class SessionGuard
{
    public static async Task CheckAsync(HttpContext context, RequestDelegate next)
    {
        var expected = context.Request.Headers["X-PremsCart-User"].ToString();
        var actual = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (context.Request.Path.StartsWithSegments("/api") &&
            (!context.Request.Path.StartsWithSegments("/api/auth") ||
             context.Request.Path.StartsWithSegments("/api/auth/profile") ||
             context.Request.Path.StartsWithSegments("/api/auth/account") ||
             context.Request.Path.StartsWithSegments("/api/auth/photo")) &&
            expected.Length > 0 && expected != actual)
        {
            context.Response.StatusCode = 409;
            await context.Response.WriteAsJsonAsync(new
            {
                code = "session_changed",
                error = "The signed-in account changed in another tab. Your view has been refreshed; please review it before trying again. Use separate browser profiles for buyer and seller."
            });
            return;
        }
        var path = context.Request.Path;
        if (context.User.IsInRole("Admin") &&
            (path.StartsWithSegments("/api/deals") ||
             (path.StartsWithSegments("/api/community") &&
              !(context.Request.Method == "GET" && path.StartsWithSegments("/api/community/profiles"))) ||
             (path.StartsWithSegments("/api/listings") &&
              (context.Request.Method != "GET" || context.Request.Query["mine"] == "true"))))
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsJsonAsync(new { error = "Administrators use the administration workspace only." });
            return;
        }
        await next(context);
    }
}

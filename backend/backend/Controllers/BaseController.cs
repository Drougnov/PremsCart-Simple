using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PremsCart.Controllers;

[ApiController]
[Authorize]
public abstract class BaseController : ControllerBase
{
    protected int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    protected bool IsAdmin => User.IsInRole("Admin");
}

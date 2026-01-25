---
title: Middleware and Filter
subtitle: 紀錄在 .Net 使用 Middleware 和 Filter 的基本應用
toc: true
cover: /gallery/covers/default.jpg
date: 2026-01-19 23:59:23
tags: [back-end, .Net]
categories:  ["Develop", "Web"]
excerpt: "Middleware 與 Filter 基本實作：Request Log、Exception Response、Authorization With Api Endpoint"
---

## 為什麼需要 Middleware 和 Filter

.Net 開發過程中，除了最主要的商業邏輯與資料庫交互等機制，還需要紀錄一些重要資訊方便我們觀測系統與回溯事件，而 Middleware 和 Filter 可以做為這樣的中間角色，幫助我們紀錄、預處理每次的 Request 處理過程。而 Middleware 和 Filter 的差別則在於作用的時機點不同。

Middleware 是作用於 .Net Core HTTP Request Pipeline 的元件，用於處理 Request 進入應用程式或 Response 送出的時機點，因此適合編寫需作用於所有 Request 的共同邏輯。

Filter 則存在於 MVC Action Pipeline 當中，在 Controller Action 執行前後執行處理的邏輯。

![middleware and filter](https://static.wixstatic.com/media/0f65e1_685db0b6220d46a98814d1b79ccb3dec~mv2.png/v1/fill/w_980,h_404,al_c,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/0f65e1_685db0b6220d46a98814d1b79ccb3dec~mv2.png)

## Middleware

使用 Middleware 的方式非常簡單，只需要建立一個 Middleware Class，並依賴 `RequestDelegate` 將 httpContext 可以往下傳遞就可以了，最後到 Progarm.cs 或 Startup.cs 使用 `UseMiddleware` 註冊。

1. 建立 Middleware Class
2. 註冊 Middleware

### Request Logging Middleware

這是個以 Middleware 實現用於紀錄每個 request log 的功能，可以發現是使用非同步處理每項任務，並記錄 Request 處理時間、Reqeust Method、Api Path 和 Request Id。同樣的從應用程式要出去時 Response 也可以記錄下來。

```c#
public class LoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<LoggingMiddleware> _logger;

    public LoggingMiddleware(
        RequestDelegate next,
        ILogger<LoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = Guid.NewGuid().ToString();
        context.Items["RequestId"] = requestId;

        var stopwatch = Stopwatch.StartNew();

        // ----- Request Log -----
        _logger.LogInformation(
            "[Request] {Method} {Path} RequestId={RequestId}",
            context.Request.Method,
            context.Request.Path,
            requestId
        );

        await _next(context);

        stopwatch.Stop();

        // ----- Response Log -----
        _logger.LogInformation(
            "[Response] {StatusCode} {Method} {Path} {Elapsed}ms RequestId={RequestId}",
            context.Response.StatusCode,
            context.Request.Method,
            context.Request.Path,
            stopwatch.ElapsedMilliseconds,
            requestId
        );
    }
}
```

```c#
var app = builder.Build();
app.UseMiddleware<LoggingMiddleware>();
```

### Exception Middleware

這個則是用於處理例外錯誤，這樣就不需要在 controller 使用 try catch，只要負責拋出 Exception，省下非常多程式量。

```c#
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IWebHostEnvironment _env;

    public ExceptionMiddleware(
        RequestDelegate next,
        ILogger<ExceptionMiddleware> logger,
        IWebHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (BusinessException ex)
        {
            _logger.LogWarning(ex, "Business exception");
            await WriteErrorResponse(context, ex.StatusCode, ex.Message);
        }
        catch (System.Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");

            var message = _env.IsDevelopment()
                ? ex.Message
                : "Internal server error";

            await WriteErrorResponse(context, 500, message);
        }
    }

    private static async Task WriteErrorResponse(
        HttpContext context,
        int statusCode,
        string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            success = false,
            error = new
            {
                code = statusCode,
                message
            }
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(response)
        );
    }
}
```
```c#
var app = builder.Build();
app.UseMiddleware<ExceptionMiddleware>();
```

**注意 Middleware 註冊的順序**

Middleware 的註冊順序會影響使用的結果，因為是一層傳一層的不是並行

![Middleware](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/index/_static/request-delegate-pipeline.png?view=aspnetcore-10.0)

如下面 Code 表示

```c#
app.UseMiddleware<ExceptionMiddleware>();
app.UseMiddleware<LoggingMiddleware>();
app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
```

這樣的處理順序就是

```
Request
 ↓
ExceptionMiddleware (Before)
 ↓
LoggingMiddleware (Before)
 ↓
HttpsRedirection
 ↓
Routing
 ↓
Authentication
 ↓
Authorization
 ↓
Controller / Endpoint
 ↓
Authorization (After)
 ↓
Authentication (After)
 ↓
Routing (After)
 ↓
HttpsRedirection
 ↓
LoggingMiddleware (After)
 ↓
ExceptionMiddleware (After)
 ↓
Response 
```

而如果 ExceptionHandler 的位置與 LoggingMiddleware 顛到，這樣就無法記錄到 LoggingMiddleware 的 Exception。

正常開啟一個 MVC 專案的 Middleware 順序長這樣

![Middleware order](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/index/_static/middleware-pipeline.svg?view=aspnetcore-10.0)

### ExceptionHandler

其實 .Net 有內建 Exception 處理的 Middleware，實作方式是透過導向到 Controller 的 api endpoint。使用 Problem Object 回傳會附帶 RFC 7807-compliant 的錯誤狀態碼說明，對新手開發者友善。

```c#
[ApiController]
[Route("api/[controller]")]
public class ErrorController : ControllerBase
{
    [Route("/error")]
    public IActionResult Error() => Problem("Oops there is a problem. Excuse me and smile!");

    [Route("/error-local-development")]
    public IActionResult ErrorLocalDevelopment(
    [FromServices] IWebHostEnvironment webHostEnvironment)
    {
        if (webHostEnvironment.EnvironmentName != "Development")
        {
            throw new InvalidOperationException("Ugggh! This is not for Production, go away.");
        }
        var context = HttpContext.Features.Get<IExceptionHandlerFeature>();
        return Problem(
            detail: context.Error.StackTrace,
            title: context.Error.Message);
    }
}
```

```c#
if (env.IsDevelopment()) app.UseExceptionHandler("/error-local-development");
else app.UseExceptionHandler("/error");     
```

## Filter

Filter 作為 MVC 當中的攔截元件，可以在 Action、Model Binding、Action Result 的過程適當介入，幫助我們針對不同的 Controller 做適當的處理，幫助我們開發上責任畫的更加清晰。

Filter 可以分為
- Authorization filters
    - 最先執行，在 Action、Model Binding 之前
    - 如果 request 沒有通過 authorization 則終止整個 Request pipeline
    - 用途：身分驗證，角色權限檢查

- Resource filters
    - 在 authorization 後執行
    - 會實作 `OnResourceExecuting` 和 `OnResourceExecuted` 
    - 在 model Binding 前後執行
    - 可同時存取 HttpContext 與即將進入 MVC 的資源
    - 用途：快取 Action Result、Request 預處理、大型資料初始化（如檔案、串流）

- Action filters(MVC 專屬)、Endpoint filters（ASP.NET Core 7+）
    - 當 Controller Action 被呼叫時立刻執行
    - 可以改變傳入的 Reqeust argument，傳出的 Response result
    - 不支援 Razor Page
    - **但 Endpoint filter 可以被套用在 route 和 MVC 架構上，如 Minimal API 專案**
    - 用途：model 驗證、包裝改寫 Action Arguments、Action Result

- Exception filters
    - 會在 model binding 和 action filter 之後，但會在 action result 被執行前執行
    - 只處理 action 執行過程和 action result 執行過程發生的例外
    - 不會處理 middleware、model binding、routing 發生的例外
    - 用途：將 Domain Exception 轉成 HTTP Response

- Result filters
    - 會在 action result 發生前後執行
    - 只會在 action result 成功後才會執行
    - 用途：修改 Response Header、包裝 Response 資料

觸發順序

```bash
Authorization Filter
 ↓
Resource Filter (Before)
 ↓
Model Binding
 ↓
Action Filter (Before)
 ↓
Action Method
 ↓
Action Filter (After)
 ↓
Exception Filter (若發生例外)
 ↓
Result Filter (Before)
 ↓
Result Execution
 ↓
Result Filter (After)
 ↓
Resource Filter (After)
```

### 使用 ActionFilter

我們使用 ActionFilter 來記錄每個 Action 處理的時長，那為什麼不要在 middleware 做就好，這是因為 middleware 沒有辦法抓取到 Action 的資訊，只能知道這個 reqeust 處理多久，但不知道是誰做的，而可以透過 action filter 與 action 高耦合的關係可以更好捕抓到這些資訊。

```c#
public class ExecutionTimeActionFilter : IActionFilter
{
    private Stopwatch? _stopwatch;

    public void OnActionExecuting(ActionExecutingContext context)
    {
        _stopwatch = Stopwatch.StartNew();
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        _stopwatch?.Stop();

        var elapsedMs = _stopwatch?.ElapsedMilliseconds;
        var actionName = context.ActionDescriptor.DisplayName;

        Console.WriteLine($"Action '{actionName}' executed in {elapsedMs} ms");
    }
}
```
```c#
builder.Services.AddScoped<ExecutionTimeActionFilter>();
```
```c#
[ServiceFilter(typeof(ExecutionTimeActionFilter))]
[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        Thread.Sleep(200);
        return Ok("orders");
    }
}
```

## 總結

使用 Middleware 和 Filter 可以幫助我們將權限分配、Log 紀錄、例外處理等維護需要的功能獨立出來，避免與商業邏輯混和造成維護上的一大難點。但記得前後順序會互相影響輸入輸出的結果，就比如我同時使用 Filter 定義 Response 的回傳格式，連 Exception 也同樣定義完整，導致處理 Exception 的 Middleware 認為這不是 Exception，當作正常的 JsonResponse 送出，結果就沒有導向到我想要的 errorPage，所以才把 Filter 改成只處理 Success Status Code 的 repsonse 就好。用的好 Middleware 和 Filter 可以幫助我們更清楚的了解整個專案的全貌，才不會出現這個 API endpoint 有這個 log 功能，另一個 API endpoint 卻沒有的迥異情況。

## 參考資料
[middleware-and-filters](https://www.thetechplatform.com/post/middleware-and-filters-power-in-asp-net-core)
[middleware-learn.microsoft.com](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-10.0)
[filter-learn.microsoft.com](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)
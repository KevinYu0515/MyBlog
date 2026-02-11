---
title:       "Inversion of Control And Dependency Injection"
subtitle:    "控制反轉一設計概念經由依賴注入實現的 .Net 案例探討與紀錄"
date: 2026-01-18 22:41:31
tags: [back-end, ASP.Net]
cover: /gallery/covers/default.jpg
categories:  ["Develop", "Web"]
excerpt: "從在 Service 裡直接 new 物件開始，帶你一步步理解 IOC 與 .NET DI，說明為什麼這樣寫程式更好維護，也更容易測試。"
toc: true
---

## Inversion of Control 是什麼

當我們撰寫一個 Service 來處理商業邏輯時，往往需要透過 Repository 與資料庫進行互動。最直覺的做法，可能會像下面這樣，在 Service 內部直接建立所需的物件：

```c#
public class TestService
{
    private IProductRepo _productRepo;
    public TestService()
    {
        AppDbContext appContext = new AppDbContext(
            new DbContextOptions<AppDbContext>(),
            new SqlLoggingInterceptor()
        );
        _productRepo = new ProductRepo(appContext);
    }

    public void Print(int productId)
    {
        var product = _productRepo.GetProductById(productId);
        Console.WriteLine(product);
    }
}
```

乍看之下這樣的寫法沒有問題，但實際上卻隱藏了幾個潛在風險。首先，`TestService` 不只負責商業邏輯，還同時負責建立依賴物件，例如 `AppDbContext` 與 `ProductRepo`。這使得 Service 的職責開始變得不單一。其次，Service 與具體實作產生了高度耦合。一旦未來需要更換 Repository 的實作，或是在測試時想改用 Mock Repository，都必須修改 Service 內部的程式碼。這樣的設計，讓系統變得難以測試、難以擴充。

那麼，有沒有一種方式，可以讓 Service 只宣告自己需要哪些介面，而不必負責物件的建立與組裝？
答案就是 IOC（Inversion of Control，控制反轉）。

所謂的「控制反轉」，指的是：
> 將「物件建立與依賴管理的控制權」，從原本的使用者（Service），反轉交由外部機制來負責。

因此，Service 不再主動 new 任何依賴，而是被動地「接收」所需要的物件。如此一來，Service 可以專注於商業邏輯本身，而依賴的建立與生命週期管理，則交由外部機制處理。上面這段 `TestService` 就可以簡化成這樣

```c#
public class TestService
{
    private readonly IProductRepo _productRepo;

    public TestService(IProductRepo productRepo)
    {
        _productRepo = productRepo;
    }

    public void Print(int productId)
    {
        var product = _productRepo.GetProductById(productId);
        Console.WriteLine(product);
    }
}
```

`TestService` 不用需要知道 IProductRepo 實作的對象是誰，並且也不在乎怎麼建立出來，這樣就只要專心關注在 `TestService` 的工作就好，接著當我們呼叫這個 Service，才需要將其需要的物件建出來，如下

```c#
var dbContext = new AppDbContext(
    new DbContextOptions<AppDbContext>(),
    new SqlLoggingInterceptor()
);

IProductRepo productRepo = new ProductRepo(dbContext);
var service = new TestService(productRepo);

service.Print(1);
```

透過這段就可以知道創建 `TestService` 所需的物件這件責任已經轉移到外面，這就是個簡易的 IOC 概念。

但是當我們的 `Service` 一旦開始增多就會導致外面建立的環境變得凌亂，這時我們試試透過 `Factory Pattern` 對此做些集中管理。

```C#
public class ProductRepoFactory
{
    public IProductRepo Create()
    {
        var dbContext = new AppDbContext(
            new DbContextOptions<AppDbContext>(),
            new SqlLoggingInterceptor()
        );

        return new ProductRepo(dbContext);
    }
}

var factory = new ProductRepoFactory();
var productRepo = factory.Create();

var service = new TestService(productRepo);
service.Print(1);
```

那麼這樣建立 Service 所需要的 Repo 這項工作，我們就只需要在 Factory 維護就好，但如果 Factory 的量開始變多，會發現其實有需多相同之處，如 `DbContext` 被作為 Repo 依賴的對象，而 Repo 又做為 Service 依賴的對象，那這時我們就需要有一個地方可以管理這些相依關係，`DI Container` 就這時候派上用場了。

## Dependency Injection Container

DI Container 可以被視為一個「物件管理中心」，主要負責四件事：

- 建立物件（Object Creation）：決定什麼時候要建立物件並如何建立。
- 解析相依關係（Dependency Resolution）：當某個類別需要其他依賴時，Container 會自動找出並組裝完整的依賴鏈。
- 管理生命週期（Lifetime Management）：決定物件是每次都建立新物件，還是整個應用程式共用同一個物件。
- 注入依賴（Dependency Injection）：將建立好的依賴，**自動注入**到建構式或其他注入點中。

而這就是在 Factory 的基礎上實現自動尋找依賴、建立組裝並將加入到需要的類別上，我們唯一要做的事就是列出 DI 規則就好。在 .Net 就可以透過 DI 表示成這樣

```c#
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>();
builder.Services.AddScoped<IProductRepo, ProductRepo>();
builder.Services.AddScoped<IOrderRepo, OrderRepo>();
builder.Services.AddScoped<TestService>();
```

這樣子我們就不需要再把 `new ProductRepoFactory`、`Create` 這些建立組裝的程式寫出來，通通靠 DI 幫我們自動完成就可以了。那下面會對 `.Net DI` 做更多的說明

首先是生命週期的部分，在 `.Net DI` 可以分為三種

- **Transient**
每次請求都建立新實例，當每次被解析時，都會建立一個新的物件。因此不會被重用、狀態不會被共享、建立成本由呼叫頻率決定。適合用在不保存狀態、只負責運算或轉換邏輯的元件，
如：Serializer、Helper / Utility、Mapper / Converter。

- **Scoped**
在一個作用範圍內共用，在 ASP.NET Core 中，常見如 HTTP Request 就是一個 Scope，也就是說在同一個 Request 內會共用，是 Web 專案中最常用的 Lifetime。
如：Service、Repository、DbContext。

- **Singleton**
整個應用程式共用同一實例。
如：Cache、Config、FeatureFlag。

要注意的是
Singleton 不能直接依賴 Scoped 服務，因為 Singleton 比 Scoped 還要長，只有當 Singleton 釋放時，其依賴的對象才會被釋放，否則會造成生命週期錯亂。另外這也表示在 Singleton 依賴 Transient 服務，只會建立一次而已。

```C#
services.AddSingleton<MyService>();
services.AddScoped<MyRepo>();

public class MyService
{
    public MyService(MyRepo repo) { } // ❌
}
```

另外在 .Net 提供了一個介面稱作 `IServiceProvider`，可以被用來依賴在其他類別當中。

```C#
public class TestService
{
    private readonly IServiceProvider _provider;

    public TestService(IServiceProvider provider)
    {
        _provider = provider;
    }

    public void Print()
    {
        var repo = _provider.GetService<IProductRepo>();
    }
}
```

但這個所帶來的問題是依賴的對象被隱藏起來，沒有辦法從外部知道 `TestService` 依賴什麼，這在下一節談及測試就會遇到些問題。那有沒有什麼情境適合這個介面使用，這就需要結合另一個介面說明，`IServiceScopeFactory`。

```C#
public class Worker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public Worker(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IProductRepo>();
        // ...
    }
}
```
這邊以 BackgroundService 為例，因為沒有 HTTP Request Scope，所以不能直接注入 Scope Service 使用，因此就需要透過 `ScopeFactory` 來建立 Scope，而這個 Scope 就會透過 `IServiceProvider` 來取得所需的 Service 使用。

## IOC 概念與單元測試

在測試這一點上，如果不將依賴物件轉移到外部實作會導致沒有辦法單元測試。

```C#
public class TestService
{
    private IProductRepo _productRepo;

    public TestService()
    {
        var dbContext = new AppDbContext(
            new DbContextOptions<AppDbContext>(),
            new SqlLoggingInterceptor()
        );

        _productRepo = new ProductRepo(dbContext);
    }

    public Product Print(int productId)
    {
        return _productRepo.GetProductById(productId);
    }
}

[Test]
public void Print_Returns_Product()
{
    var service = new TestService(); // ❌
    var product = service.Print(1);
}
```

從上面程式碼可得知，直接創建 `TestService` 會沒有辦法替換掉 `ProductRepo`，使得這個測試會變成整合測試，真的會去呼叫到 DB。因此改成透過參數將依賴物件傳入，就可以解決這個問題。

```C#
public class TestService
{
    private readonly IProductRepo _productRepo;

    public TestService(IProductRepo productRepo)
    {
        _productRepo = productRepo;
    }

    public Product Print(int productId)
    {
        return _productRepo.GetProductById(productId);
    }
}

public class FakeProductRepo : IProductRepo
{
    public Product GetProductById(int id)
    {
        return new Product { Id = id, Name = "Test Product" };
    }
}

[Test]
public void Print_Returns_Product()
{
    var fakeRepo = new FakeProductRepo();
    var service = new TestService(fakeRepo);
    var result = service.Print(1);
    Assert.AreEqual("Test Product", result.Name);
}
```

因此透過 DI 實現 IOC 概念的做法除了在維護與擴充上提升需多方便性，在測試方面也提供接口使我們可以任意替換掉依賴的物件，不需要真的連線到真的資料庫，加快測試的速度。
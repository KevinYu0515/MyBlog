---
title: "Dependency Injection and Scrutor"
subtitle: "使用 Scrutor 簡化大量 Service 註冊並使用 Decorate 擴充 Service"
toc: true
date: 2026-01-19 22:28:10
tags: [back-end, ASP.Net]
cover: /gallery/covers/default.jpg
categories:  ["Develop", "Web"]
excerpt: "介紹 Scrutor 如何強化 .NET DI 的服務註冊能力，透過 Decorator 與 Scan，讓橫切關注點與大量 Service 註冊變得更乾淨、好維護"
---

## Scrutor 是什麼

Scrutor 是一個基於 .NET 內建 DI（Microsoft.Extensions.DependencyInjection） 的擴充套件，主要用來解決「服務註冊過於繁瑣、不易規則化」的問題。

接者將著重於這兩點說明
- Decorator：用來包裝既有 Service
- Assembly Scan：用規則大量註冊 Service

### Decorator

當一個 Service 需要打印 log 時，最簡單的方法就是直接 `Console.WriteLine` 打印在 Console，但這樣的 log 無法儲存下來，所以會使用 `ILogger` 介面建立一個 `logger` 物件將 log 打印在某個檔案作為審計的參考依據，簡單來說就是可以透過 `DI` 將 `ILogger` 注入 Service 後直接使用就可以了

```c#
public class TestService
{
    private readonly ILogger<TestService> _logger;

    public TestService(ILogger<TestService> logger)
    {
        _logger = logger;
    }

    public void Print(int productId)
    {
        _logger.LogInformation($"This is Service Beginning...");
        // do something...
        _logger.LogInformation($"This is Service Ending...");
    }
}
```


但這一樣子也是把 `logger` 加進去 Service 內與商業邏輯混在一起，如果只是單純要記錄進入 Service 前後的狀態，可以改成使用 `Decorate Pattern` 將整個 Service 包起來，我們可以使用 `Scrutor` 插件提供的語法實現這個做法

```bash
dotnet add package Scrutor
```
```c#
public class TestServiceDecorator: ITestService
{
    private readonly ITestService _inner;
    private readonly ILogger<TestServiceDecorator> _logger;
    public TestServiceDecorator(ITestService testService,  ILogger<TestServiceDecorator> logger)
    {
        _inner = testService;
        _logger = logger;
    }
    
    public void Print()
    {
        _logger.LogInformation("ITestService.Print() Beginning...");
        _inner.Print();
        _logger.LogInformation("ITestService.Print() Ending...");
    }
}

public class TestService: ITestService
{
    public void Print()
    {
        // do something...
    }
}
```
```c#
// 需要在 Program.cs 註冊
builder.Services.AddScoped<ITestService, TestService>();
builder.Services.Decorate<ITestService, TestServiceDecorator>();
```

這樣當我們呼叫 `TestService` 時就會先經過 `TestServiceDecorator` 再進到 `TestService`，這樣我們就可以個別對 Service 的所有 method 前後加上進出狀態的 log。

### Scan Service

除了 Decorator 之外，Scrutor 另一個非常實用的功能是 Assembly Scan，可以透過規則一次註冊大量 Service。

```c#
builder.Services.Scan(scan => scan
    .FromAssemblyOf<TestService>()
    .AddClasses(classes => classes.AssignableTo<ITestService>())
    .AsImplementedInterfaces()
    .WithScopedLifetime()
);
```

- `FromAssemblyOf`：要掃描哪個 dll，這邊指的是有 TestService 的 dll，也就是擁有 TestService 的 Project。這邊等價概念於 `typeof(TestService).Assembly`
- `AddClasses`：挑出要註冊的 class，這邊指的是有實作 `ITestService` 的 Service Class，通常是找 class，不會註冊 interface、abstract class
- `AsImplementedInterfaces`：把每個挑到的 class，用他實作的介面註冊
```c#
public class TestService : ITestService { }
public class AnotherTestService : ITestService, IDisposable { }
```
以上面這個為例，就是會將 `ITestService` 註冊 `TestService` 和 `AnotherTestService`，而 `IDsponsable` 也會註冊 `AnotherTestService`。

- `WithScopedLifetime`：以 Scope 生命週期註冊 Service

那麼現在有個情境是我有三個 Service 如下

```c#
public class ProductService : IProductService { }
public class TestService : ITestService { }
public class UserService : IUserService { }
```

如果我使用上述提到的方式註冊，會導致
- ✅ TestService 會被註冊
- ❌ ProductService 不會被註冊
- ❌ UserService 不會被註冊

**改用命名規則掃描**
所以我們可以換個做法將 `AddClasses` 改成挑選出結尾為 `Service` 的 Class，這樣就能成功將三個 Service 註冊，不過要注意的是一個介面只能註冊一個 Class。
```c#
builder.Services.Scan(scan => scan
    .FromAssemblyOf<TestService>()
    .AddClasses(classes => classes
        .Where(type => type.Name.EndsWith("Service")))
    .AsImplementedInterfaces()
    .WithScopedLifetime()
);
```

**避免註冊非預期介面**
那如果我不想要註冊諸如 `IDsponsable` 這樣有特別功能的介面，就可以調整一下 `AsImplementedInterfaces`
```c#
builder.Services.Scan(scan => scan
    .FromAssemblyOf<TestService>()
    .AddClasses(classes => classes
        .Where(t => t.Name.EndsWith("Service")))
    .AsMatchingInterface()
    .WithScopedLifetime()
);
```

**限制 Namespace 範圍**
那如果想要縮小範圍，我只要與 TestService 同一個 namespace 底下的 Class 註冊，可以使用 `InNamespaceOf` 來限制
```c#
builder.Services.Scan(scan => scan
    .FromAssemblyOf<TestService>()
    .AddClasses(classes => classes
        .InNamespaceOf<TestService>())
    .AsMatchingInterface()
    .WithScopedLifetime()
);
```

## 總結

Scrutor 並不是新的 DI Container，而是用來 強化 .NET 內建 DI 註冊能力 的工具。它讓服務註冊可以從「一個一個手動 AddScoped」進化為「依規則批次註冊」，同時也提供了對 Decorator Pattern 的原生支援。在 Service 數量不多時，手動註冊仍然清楚直觀；但當系統逐漸模組化、Service 數量增加，Scrutor 能有效降低 DI 設定的重複性與維護成本。如果說 DI Container 解決的是「如何建立與組裝物件」，那麼 Scrutor 則是讓這個過程變得更有規則、也更容易管理。
---
title: 集成NativeScript iOSRuntime到已有工程
date: 2016-04-11 12:50:49
categories: 技术
tags: [iOS,NativeScript]
---

[NativeScript](https://www.nativescript.org/)是一个保加利亚公司**Telerik**开发的, 其目标比较受争议: `write once, run everywhere`. 它提供了Android, Windows Phone和iOS的JS Runtime, 以及一些周边比如css和html的解析, 一些wrap的模块来消除不同平台的差异. 但是我们只需要它提供的Runtime来用JS开发原生应用就好, 因为写起来还不错.

## iOS Runtime

关于NativeScript的介绍可以去Google一下, 很多人拿来和[react-native](https://facebook.github.io/react-native/)比较, 一般对比比较多的是如何编写页面这一块. 当然这不是这篇文章的目的, 我只是比较在意NativeScript的Runtime, 它提供了js到原生的调用转换, 而且看起来挺不错. Android和Windows Phone没有研究过, 这里只聊聊iOS Runtime. 后文提到runtime如无特殊说明都是指iOS Runtime.
先看看code:

```js
var vc = UIView.alloc().init();
// var vc = new UIViewController(); // same as last line

vc.view.backgroundColor = UIColor.redColor();

var nav = /* some navigation controller */;

nav.pushViewControllerAnimated(vc, true);

console.log('hello world');
```

看起来真的挺不错的. 
* 创建`UIViewController` 可以用 `new`关键字, 也可以使用方法调用的形式.
* 直接使用**property**.
* 调用多个参数的API时, 是把所有的参数label都拼到了一起, 所以`pushViewController:Animated:`转换成了`pushViewControllerAnimated`.
* 打日志还是`console.log`.

更多特性和限制看官网doc. 现在还支持了JS6, 看官方说明也支持TypeScript, 而且在和Angular team合作, 可以支持Angular2的样子.

对了, 这货开源, Github上还提了一嘴:
> **The iOS runtime is written in a fun mix of C++, Objective-C, and more**. 

然后还有一个**NativeScript Member** PanayotCankov 对issue的[回复](https://github.com/NativeScript/NativeScript/issues/1121):
> In the long term you may consider the ios-runtime is doing with JavaScript something similar to what Swift is doing.

呵呵...

## 集成到现有工程

关于如何完全用**NativeScript**写应用, 可以去官网看教程. 我这里就只记录一下集成Runtime到已有工程的步骤. **NativeScript**在创建一个新应用时会生成iOS工程目录.
里面有一个叫做'internal'的文件夹. 所有的东西都在里面了.

#### 配置Build Phases

Runtime需要添加3个`run script`. 可以照着样例工程里面来copy, 只要路径正确即可. 3个`run script`分别是:
1. `nativescript-pre-build` 添加在**Target Dependencies**后面.
2. `nativescript-pre-link` 添加在**Compile Sources**后面.
3. `nativescript-post-build` 添加在最后, 这个是为了清除掉模拟器相关的切片, 不然Apple会拒.

#### 配置Build Settings
**internal**里面好几个xcconfig, 其实很简单的, 只用到了一个`nativescript-build.xconfig`, 至于是用xcconfig还是直接裸写在setting里面, 看自己的需求. 
文件里面配置了`HEADER_SEARCH_PATHS`, `OTHER_LDFLAGS`以及`FRAMEWORK_SEARCH_PATHS`. 这些值里面有些是相对路径, 自己调整正确就好. 

默认配置的是用`.a`, 如果要改成用framework, 先在`OTHER_LDFLAGS`里面去掉对`.a`的引用

```
-lNativeScript -L$(SRCROOT)/internal/NativeScript/lib //引用的是.a, 删掉这个
```

然后把`NativeScript.framework`拖拽到自己应用的Target的**Embedded Binaries**里面, 这个framework是iOS8以后支持的dynamic framework. 
还需要在这个framework的根目录下添加一个**Modules**文件夹, 在文件夹里面创建module.modulemap文件, 其内容如下:

```
framework module NativeScript {
  umbrella header "NativeScript.h"

  export *
  module * { export * }
}
```

#### 修改程序入口
看了一下样例工程, 扒出来这几行关键**OC**代码. swift怎么弄不会, 所以是OC哦.

```objc
#import <NativeScript/NativeScript.h>
// #import "YourTarget-swift.h" 如果用AppDelegate是swift类

extern char startOfMetadataSection __asm("section$start$__DATA$__TNSMetadata");	//抄过来的...

int main(int argc, char * argv[])
{
    @autoreleasepool {
        [TNSRuntime initializeMetadata:&startOfMetadataSection];
        [TNSRuntimeInspector setLogsToSystemConsole:YES];	// 可以自己添加条件编译, 在release下扔掉
        return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]));
    }
}
```

如果`APPDelegate`是**swift**写的, 需要添加**Bridging Header**(避免build error), 并import一下swift到OC的转换头文件, 不是那个bridging header, 而是`YourTarget-swift.h`那个文件. 详情查阅[Apple文档](https://developer.apple.com/library/ios/documentation/Swift/Conceptual/BuildingCocoaApps/MixandMatch.html#//apple_ref/doc/uid/TP40014216-CH10-ID122).

#### 使用
如果没啥问题的话, 应该就能build过了. 接下来简单配置一下, 创建一个目录比如`JS`, 以文件夹引用的方式引入, 并将其设置为copy到mainBundle. 文件夹内添加一个`app.js`文件, 随便写点儿log神马的.

```swift
let runtime = TNSRuntime(applicationPath: appPath)	// 指向文件夹
runtime.scheduleInRunLoop(NSRunLoop.mainRunLoop(), forMode: NSRunLoopCommonModes)

runtime.executeModule("./") 	// 执行app.js
```

## 存在的问题

目前也只是刚扒出来, 网上的资料比较少, 对**JavaScriptCore**也不是很了解, 弄起来比较费劲. 目前存在一些问题:
1. `TNSRuntime`对象有个`globalContext`方法返回`JSGlobalContextRef`, 但是拿去创建`JSContext`就会崩溃, 报**WTFCrash**... 不过直接用C的API去执行JS貌似没事. 只要想要retain, 或者copyName都会导致crash. 不知道原因.

2. 每次build都要消耗一定时间去generate metadata. SSD大概十几秒的样子?

3. 提供了一大堆module, 用得上的没几个. 代码是直接复制到app bundle, 等于开源了, 当然处理一下也是可以的.

## 优点

其实研究一下它主要是看中它JS编写原生页面的能力, coding起来跟写OC或者swift很像, 而且可以完全不理会它提供的包, 依然用自己熟悉的方式开发. 学习成本几乎为0啊. 感觉如果认真研究一下, 配置成远端下载脚本到本地执行应该是没有问题(可能有不少坑). 这样热更新应用, 甚至去掉h5, 改用NativeScript来提供页面都可以尝试, 原生效果肯定比h5好啊.

还有它遵循**CommonJS**, 可以打包一些js的库来用, 挺方便的. 

最重要的一点最后说: 它拦截调用, load必须的模块, 转换到原生. 不是通过自己去整理所有的API, 而是做了一中机制, 也就说iOS SDK更新了, 你不需要更新NativeScript即可立即开始使用新API. 而其他的比如**Xamarin**就必须等, 而**React-Native** 目前只能通过写模块来和native通信, 不具备直接调用的能力.


如果再有其他进展, 再继续更新本文.



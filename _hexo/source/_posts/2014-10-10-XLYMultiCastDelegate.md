---
layout: post
title:  "XLYMultiCastDelegate 多播代理"
date:   2014-10-10 16:00:00 +0800
categories: 技术
tags: [GitHub,iOS]
---

[XLYMultiCastDelegate]: https://github.com/kaizeiyimi/XLYMultiCastDelegate
[runtime doc]: https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/ObjCRuntimeGuide/Introduction/Introduction.html
[swift]: https://developer.apple.com/library/ios/documentation/Swift/Conceptual/Swift_Programming_Language/index.html

通知中心NSNotificationCenter, 大家都知道怎么用. 需要add observer, 指定selector, 指定监听的通知(字符串), 在selector对应的方法中获取userInfo字典, 根据key获取value进行操作, 最后还得在某个时机remove observer. 虽然按照规范去编写代码不容易出错, 但是仍然有很多麻烦, selector的使用错误不容易在编译时检查, 通知和userInfo都是使用字符串, 需要大量定义和维护字符串常量. 这点有时候着实会让人很烦恼. 本文介绍一种利用**消息转发**和**代理**来做广播的想法.

记得做第一个项目时(一年多前...), 需要做聊天, 当时因为很多原因没有重新开发, 而是使用了之前项目的聊天模块代码, 结构十分混乱, 大量的使用了Notification并且很多地方的用法是错误的. 虽然开发得很不爽, 总之是硬扛下去了, 不堪回首. 期间积累了一些想法, 也写过一些demo验证了一些, 其中一个就是本文介绍的`MultiCastDelegate`. 

我们遇到了一类问题, 当某个数据发生变化时, 可能有多个对象期望得到通知, 但是各自所处的线程或者Queue是不一样的. NSNotificationCenter除了在发送通知时的一些常量定义的问题外还有一个重要的特性: 通知的调用是在postNotification的调用线程中同步执行. 如果我们有主线程和后台的对象同时监听通知, NSNotificationCenter就无法满足需求了, 总是至少有一个observer不是在自己所属的线程或者Queue调起. 难道还要自己再次dispatch一下?

## XLYMultiCastDelegate

### 使用简介
**[XLYMultiCastDelegate]**来拯救你. 它的中文名字叫多播代理? 其实是广播. 它的作用跟通知中心NSNotificationCenter很像, 要做的事情也是一对多的通知. 实现的思路严重依赖Objective-C的消息转发机制. 它不是完全的通知中心的代替实现, multiCastDelegate 其实需要使用一个protocol来初始化. 之后添加的observer或者说delegate必须要实现这个protocol, 否则将不能添加. 先看看基本使用, 再继续介绍.

```objective-c
@protocol SimpleProtocol <NSObject>
@optional
- (void)someOptionalMethod;
@end

//创建
XLYMultiCastDelegate *multiDelegate = [[XLYMultiCastDelegate alloc] initWithConformingProtocol:@protocol(SimpleProtocol)];
//添加代理
[multiDelegate addDelegate:self dispatchQueue:dispatch_get_main_queue()];
//需要有一个地方来保存multiCastDelegate实例
self.multiDelegate = (id<SimpleProtocol>)multiDelegate;
//可以检查是否实现了协议
BOOL result = [self.multiDelegate conformsToProtocol:@protocol(SimpleProtocol)];
```

调用其实很简单, 首先需要创建一个multiDelegate对象, SimpleProtocol真的很simple, 只有一个可选方法. 添加代理时可以指定dispatchQueue参数, 这个Queue将是代理方法被调起的Queue, 解决了通知中心不能往不同的线程或Queue发送通知的问题. 创建了multiDelegate对象当然需要找个地方存起来. 以后也可以随时添加或者移除delegate. 当然你可以检查multiDelegate是否实现了协议, 结果是YES.

### 原理说明

下面详细说明一下实现的细节和需要注意的问题, 会涉及到一些runtime的知识, 这里不做详细的介绍, 需要了解的请参阅[苹果的文档][runtime doc]. 这里先仅对OC环境进行说明, swift的后面单独说明.

* 协议检查

协议是一个`Protocol *`类型. 代码中可以这样声明变量和获取协议:

```objective-c
//声明为property
@property (nonatomic, strong) Protocol *protocol;

//获取
NSString *protocolName = @"SimpleProtocol";
Protocol *protocol = objc_getProtocol(protocolName.UTF8String);

//或者
Protocol *protocol = @protocol(SimpleProtocol);
```
我们需要记录下当前多播代理所支持的协议, 协议在runtime环境里面应该是单例的形式存在的. 在添加新的delegate到多播代理中时进行的检查很简单 `[delegate conformsToProtocol:self.protocol]`, 如果通过则允许添加. 内部会创建一个delegateNode对象来weak持有添加的delegate, 并记录对应的delegateQueue. 还有一些添加删除的管理delegate的方法就不多说, 都是些简单逻辑.

* runtime支持

1. 重写 `-[NSObject conformsToProtocol:]`方法, 判定是否实现了某个协议. 

2. 重写 `-[NSObject respondsToSelector:]`方法, 遍历现有的代理, 只要任何一个能够响应则认为能够响应.

3. 重写 `-[NSObject methodSignatureForSelector:]`方法, 详细文档说明参考apple的runtime文档, 我们这里的场景是multiDelegate自己不能响应方法调用, 因此需要做调用转发, 这个时候该方法会被调用来给`NSInvocation`对象设置方法签名. 是为自己不能响应的方法寻找方法签名, 仍然遍历现有的代理, 找到一个正确地签名即可. 签名记录了这个方法的返回值类型, receiver的类型, 以及参数个数等信息. 如果没有delegate能够提供签名, 则默认提供doNothing的方法签名, 正如其名, 啥也不做, 只是为了不崩溃. 这个行为也可以理解为消息没有接受者则丢弃.

4. 重写 `-[NSObject forwardInvocation:]`方法, 这里就是最重要的地方. 当一个对象不能相应一个selector调用时, 满足一些条件的情况下最终会走到这里, 条件如何达成请参阅[苹果文档][runtime doc], 当然我们这里是达成了, 现在我们得到了一个invocation对象, 它包含了方法签名, 参数等信息, 是对一个对象进行方法调用的一个封装. NSInvocation对象有一个方法`-[NSInvocation invokeWithTarget:]`, 其作用就是将target作为方法调用的receiver进行调用, 参数不变. 所以我们将遍历所有的delegate, 并在它们的delegateQueue里面进行调用, 这样就完成了消息调用的转发.

### 需要注意的问题

1. 创建XLYMultiCastDelegate实例, 添加移除delegate等管理操作都是线程不安全的, 需要使用者维护.
2. 本质上是想用代理方法调用来完成通知, 因此应该将其应用于没有返回值的代理方法. 如果一定要发送带返回值的方法调用, 内部逻辑会在发送调用的线程中同步寻找第一个能够响应此方法的delegate并调用. 这里不能使用dispatch_async, 必须同步调用, 否则调用者会立即得到nil的返回值.
3. 遍历delegate并进行方法调用的for循环使用了信号量来进行同步. Invocation不支持copy, 并且有一个问题: 如果在不同的线程同时对同一个invocation对象调用`-[NSInvocation invokeWithTarget:]`, 可能会出错, 这个错误不是崩溃, 而是target的处理错误. 比如对A,B同时进行调用, invoke调用时应该会记录当前的receiver(根据结果现象推断的), 中间还会经过一些步骤才会真正发起调用, A先被记录, 在发起调用前, B又被记录, 则两次调用的结果会是调用了两次B. 因此需要同步一下, 保证invocation对象的串行使用.

### swift支持

很不巧, 苹果发布的新的编程语言swift对runtime, KVO, KVC的支持很不友好. swift加入了模块的概念来解决OC多年的全局符号表的痛, 还有可选值什么的一些新概念. 其他的特性就是5仁月饼. 如果能够习惯OC中的block, 闭包, 那么swift里面的东西就没啥问题了, 都是些语言细节, 底层依然是runtime来支撑, 可以和OC混合编译. 细节请参阅[swift].

本来想直接用swift重新实现的, 结果被直接拒绝了. swift中不允许使用NSInvocation对象, 只能混编了. 获取协议对象时需要注意是否是swift中定义的协议:

```
//使用oc中定义的协议没有模块
XLYMultiCastDelegate(protocolName: "SimpleProtocol")
//使用 swift定义的协议需要加上模块信息, 否则无法获取
XLYMultiCastDelegate(protocolName: "XLYMultiCastDelegateDemo.SimpleSwiftProtocol")
```

然后在调用时需要用as进行类型转换才能调用方法. 

```
let multiDelegate = multiDelegateUsingOCProtocol as SimpleProtocol
```

运行时会使用`-[NSObject respondsToSelector:]`来进行检查是否可以转换. 转换成功后就可以进行调用了.

```
multiDelegate.someOptionalMethod!()
```

### 总结
消息转发机制由语言支持, 应该是受到了smalltalk的影响, ruby也有类似的机制. swift想要做成一个类型安全的语言, 支持太多动态的特性会让很多东西失去保证. 总之, 工欲善其事, 必先利其器. 多了解一些语言的特性, 能够学到一些技术的设计思路, 还能帮助简化程序设计, 同时提高逼格😜.
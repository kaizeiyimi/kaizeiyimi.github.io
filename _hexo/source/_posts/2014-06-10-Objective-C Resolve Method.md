---
layout: post
title:  "Objective-C Resolve Method"
date:   2014-06-10 12:00:00 +0800
categories: ios
tags: [iOS]
---

## objective-c中的动态消息决议

> [apple runtime 文档](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/ObjCRuntimeGuide/Introduction/Introduction.html#//apple_ref/doc/uid/TP40008048) 文档中介绍了runtime知识以及resolve method的一些内容，但是不详细。。。。

动态消息决议是在一个对象不能处理某个selector时所发生的。决议比消息转发要先发生，如果决议成功，则会调用方法，不会继续转发流程，否则进入转发流程。

决议有两个方式，一个是添加实例方法，一个是添加类方法。现在互联网上的帖子大多数都是抄袭，基本上都只讲到如何添加实例方法而对于类方法的添加都是一笔带过。本文将真正介绍如何添加实例方法和类方法。

NSObject的类声明中有如下代码:

```objective-c
+ (BOOL)resolveClassMethod:(SEL)sel __OSX_AVAILABLE_STARTING(__MAC_10_5, __IPHONE_2_0);
+ (BOOL)resolveInstanceMethod:(SEL)sel __OSX_AVAILABLE_STARTING(__MAC_10_5, __IPHONE_2_0);
```
前者是决议类方法，后者决议实例方法。触发决议的流程很简单，只需要对某个**对象**发送其不能响应的消息即可。然后会根据对象的性质调用不同的决议方法。如果是实例对象则调用`resolveInstanceMethod`，如果是class对象则调用`resloveClassMethod`。
要了解如何给**对象**动态添加方法需要知道objective-c中的类继承结构，以及理解class对象。

### objective-c的类结构

某个类如`XLPerson`，它继承自`NSObject`，一个实例为`personA`。`personA`的类为`XLPerson`，`XLPerson`是一个class对象，它的类是一种metaClass，用以下代码可以获取：

```objective-c
OBJC_EXPORT Class objc_getMetaClass(const char *name)
    __OSX_AVAILABLE_STARTING(__MAC_10_0, __IPHONE_2_0);
```

在本例中调用为`objc_getMetaClass(“XLPerson”)`,获取到的class对象是`XLPerson`的metaClass，亦即`XLPerson`的类。

### 消息决议的示例代码
1. 决议实例方法  
    
```objective-c
+ (BOOL)resolveInstanceMethod:(SEL)sel
{
    if (sel == @selector(printWithInstance)) {
        IMP imp = imp_implementationWithBlock(^(id _self, SEL sel) {
            NSLog(@"print with instance");
        });
        class_addMethod(self, sel, imp, "v@:");
        return YES;
    }
    return [super resolveClassMethod:sel];
}
```  
简单解释下，发现是`printWithInstance`的selector，手动做了一个`IMP`，然后给class对象加上。然后返回YES，告诉iOS已经决议成功，然后iOS会再尝试去class对象的`dispatch table`中寻找该实例方法，然后找到了，调用，打印出`print with instance`。

2. 决议类方法

```objective-c
+ (BOOL)resolveClassMethod:(SEL)sel
{
    if (sel == @selector(printWithClass)) {
        IMP imp = imp_implementationWithBlock(^(Class class, SEL sel) {
            NSLog(@"print with class");
        });
        class_addMethod(objc_getMetaClass(NSStringFromClass(self).UTF8String), sel, imp, "v@:");
        return YES;
    }
    return [super resolveClassMethod:sel];
}
```
决议类方法和决议实例方法的流程是一样的。唯一不同的是需要在`dispatch table`中添加方法的类对象不一样，对于类方法决议，需要在class对象的metaClass中添加。因为对class对象发送消息时需要到其metaClass的`dispatch table`中寻找，这跟调用实例方法时需要到class对象寻找是一样的。

### type encoding
上述两例中都在 `class_addMethod` 调用中传递了`“v@:”`作为最后一个参数来描述添加的方法的类型。这里注意不要用oc的中括号调用所干扰，方法的type encoding是其对应的c语言调用的类型，因为方法调用会转换为`returnType msgSend(id receiver, SEL cmd, ...)`，上例中的`v@:`代表添加的方法返回值为void(v), receiver是对象(@),cmd是selector(:)，没有其他参数。更多关于type encoding的介绍在苹果runtime文档中最后部分有介绍。

### 总结
学习只有脚踏实地才能学到。oc的runtime是整个语言的精髓，不理解它将不能理解很多oc才有的精良设计。

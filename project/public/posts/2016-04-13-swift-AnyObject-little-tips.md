---
title: swift AnyObject little tips
date: 2016-04-13
tags: swift
---

`AnyObject`在swift里面比较特别. 它是所有类都隐式实现的一个`protocol`. Apple的注释里面写着当被用作一个具体类型时, 
所有`@objc`的方法和属性都被编译器认为可以访问, 并且都被标记为隐式解包类型. 

<!-- more -->

> The protocol to which all classes implicitly conform.

> When used as a concrete type, all known **@objc** methods and
 properties are available, as implicitly-unwrapped-optional methods
 and properties respectively, on each instance of **AnyObject**. 

因此, 在强类型中就混入了弱类型的不安定因素.

## Property

```swift
let value: AnyObject = "abc"
let frame = value.frame
```

`value`其实是`String`类型, 这里声明为`AnyObject`, 然后就可以尝试访问`frame`这个`String`没有的property. 然后`frame`会是`CGRect!`类型并且值为`nil`.

如果要链式访问, 安全的做法用**?** :
```swift
let minX = value.frame?.minX  // will be 'CGFloat?'

// not safe
let minX = value.frame.minX  // will be 'CGFloat!'
```

## method

方法和属性其实是一样的. 只不过可以被调用而已. 因此code也几乎一样:
```swift
let result = value.stringByAppendingString?("test")  // will be 'String?'

// not safe
let result = value.stringByAppendingString("test")  // will be 'String'
```

## 处理JSON

经常我们从HTTP请求拿到的是JSON, 转换成`NSDictionary`或者`NSArray`再传递给应用逻辑. 现在假设我们要获取JSON里面的信息.

### 使用 valueForKey 

```swift
let name = value.valueForKey?("name")
```

但是, 如果value不是Dict, 或者value是Array但是里面的元素不是Object, 这样就有可能引发 `valueForUndefinedKey:`, 抛出exception. 当然, `valueForKeyPath`也是一样的. 

### 使用 objectForKey

所以呀, 既然认为value是JSON中的Object, 为什么不用更加自然的`objectForKey`呢? 
```swift
let name = value.objectForKey?("name")
```
这样当value不是dict, 也就没有objectForKey这个方法, 也就不会crash了. 然后name仍然是Optional. 
这样的假定在处理JSON时时有效的, 因为JSON支持的数据类型中只有object才有这个方法, 其他的array, boolean, number, string和null都没有.

### 使用 下标语法

对于用key来访问还有个偏僻的小路可以走一下:

```swift
let name = value["name"] // will be `AnyObject?!`

// or do this tricky way
let name = value["name"]?.flatMap{$0} // will be 'AnyObject?'
```

这里用`flatMap`只是一种对两层`Optional`剥壳的手段, 用 `xx ?? nil` 也能剥壳. 剥壳虽然比较丑, 但是却不会引起崩溃.

如果要继续深入keyPath的话......
```swift
let content = value["person"]?.flatMap({$0})?["id"]?.flatMap({$0}) // will be 'AnyObject?'
```

不过我觉得最好还是用`objectForKey`来从JSON获取信息, 并做好类型检查.


## 总结
呵呵哒... 总结就是不要乱用, 少年, 除非你真的知道自己在做什么



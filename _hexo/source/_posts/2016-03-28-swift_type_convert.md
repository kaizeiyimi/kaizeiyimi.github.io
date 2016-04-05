---
title: swift 2.2 类型转换小坑
date: 2016-03-28 14:00:00 +0800
categories: 技术
tags: [iOS,XCode]
---

XCode升级到了7.3, swift到了2.2. 之前发现的坑在这里验证了一下, 依然没啥变化. 特此记录一下.

本文主要填一下类型转换的坑, 包括 `=`, `as`, `is`, `Optional`, `函数参数`,`闭包` 以及`Tuple`. 总之, `class`和`非class`的待遇是不一样的, Any和AnyObject的区别也是很重要的.
`=`, `as`, `is`主要是针对Array类型, 其他`CollectionType`也类似.

本文代码中的通用定义:

```swift
protocol P {}	//swift protocol without @objc

class A {}
class B: A {}

class AP: P {}
class BP: AP {}

struct S {}
struct SP: P {}

let arrayA = [A()], arrayB = [B()], arrayS = [S()], arrayPA: [P] = [A()], arrayPS: [P] = [S()]
```

## as is, = 以及 Optional

三者的坑类似, 主要是array类型的推断. 
1. `as`操作符将一个类型转换成平级类型或者父类型, 例如 `"abc" as NSString`可以看成是平级转换, `b as A` 是转换到父类型.
2. `as!`和`as?`是用于将父类型变量转换为子类型.
3. `is`是check父类型变量是否为子类型.
4. 某种程度上, `Optional`可以看做是其`T`的父类型.

普通类型进行各种转换检查都没什么问题, 但是当普通类型碰上**集合**呢? 

先看code:

as:
```swift
arrayA as [P]  // runtime, fatal error: array cannot be bridged from Objective-C
arrayA as [Any]	// runtime, fatal error: array cannot be bridged from Objective-C
arrayA as [AnyObject]	// OK
arrayB as [A]			// OK

arrayS as [P]	// compiler, Cannot convert value of type '[C]' to type '[P]' in coercion
arrayS as [Any]	// compiler, Cannot convert value of type '[C]' to type '[Any]' in coercion
```

is:
```swift
arrayPA is [A] // OK
arrayPS is [S] // runtime, fatal error: can't unsafeBitCast between types of different sizes 
```

赋值:
```swift
let a: [P] = arrayA // runtime, fatal error: array cannot be bridged from Objective-C
let a: [Any] = arrayA // runtime, fatal error: array cannot be bridged from Objective-C
let a: [AnyObject] = arrayA // OK

let s: [P] = arrayS // runtime, fatal error: array cannot be bridged from Objective-C
let s: [Any] = arrayS // runtime, fatal error: array cannot be bridged from Objective-C
```

大概是因为OC的runtime吧. 可不是么? 文档有提到`@objc` 将指定的方法或者属性暴露给OC, 而`AnyObject`是带有这个标记的, 因此在类型检查和转换时行为跟`NSArray`差不多. `Any`没有`@objc`. `protocol` 不带`@objc`时和`Any`一样, 带上了`@objc`就和`AnyObject`一样. `Optional`也是swift特有, 因此行为上和Any类似.

```swift
arrayA as NSArray	// OK
arrayS as NSArray 	// // compiler, Cannot convert value of type '[S]' to type 'NSArray' in coercion
```

只要不牵扯到swift特有的东西(struct, 不带@objc的protocol, Optional), 大部分的转换都可以看成是到NSArray的转换, 当然swift也有类型检查, 不能乱转. 

然而事情总有意外...

真的只能这样了么? 不是的. 字面量数组可以躲过一些劫难. 因为类型推断的缘故. 继续看code:

```swift
[A()] as [P]
[A()] as [Any]
[A()] as [AnyObject]

[S()] as [P]
[S()] as [Any]
```
类型推断至上而下, 表达式的类型最终为[P], 倒推左值需要为[P], 此时左值只知道是Array, 未推断T, 进而继续推断其Generator.Element需要为P. 而A可以转换为P, 所以字面量数组创建出来就是[P]类型而不存在转换. 这是编译器做的.

赋值的操作类似, 只要把右值换成对应的字面量数组就可以成功赋值, 而`is`操作因为类型推断, 字面量数组最终的类型就是右值, 没有意义. 

哦, 类型推断哪...

## 函数参数 和 闭包

函数有入参和返回值, 调用函数时传递参数也是一个赋值的过程, 因此可以参考上文的现象. 也就是说传递进来的参数要能正确转换成函数需要的类型, 函数内部的返回值也要能正确转换为声明的类型. 只要符合这些条件, 调用就没有问题.

那么问题来了, 闭包也是函数, 闭包的类型如何转换?

又来一份code:
```swift
func test(f: A -> P) {}
func param(p: P) -> A {}

test(param)	// OK
```

原理并不难, 先看闭包的入参, 需求为A类型, 也就意味着在`test`方法内部会传递一个变量给`f`, 这个变量会在传递给`f`时转换为`A`类型. 也就是说`f`应该能够处理`A`类型的入参.因此, 如果我们传递的闭包的入参是`A`的父类型`P`, 它也能处理类型为`A`的参数, 而如果是子类型`B`则可能出错. 

`A`一定是`P`但不一定是`B`. 

同样, 对于返回值, `test`方法要返回`P`类型, 因此我们可以返回`P`类型的子类型`A`.

前文提到, 某种程度上可以将`Optional`看做是其`T`的父类型, 因为编码过程中发现它在类型转换上的结果和父类型子类型的一致.因此下面的code也不需要特别处理:

```swift
func testNil() -> A? {
	let a = A()
	return a 		// 编译器自动wrap
}
```

## Tuple

Tuple没有什么特别的, 就是类型转换的时候不管类型继承, 当然, 字面量方式除外. 看起来就像是字符串比较:

```swift
let value = (A(), A()) as (P, P)	// value 是 (P, P)类型
if value is (A, A) {
	
} else {
	// will got here
}

```

## 总结

写的时候尽量注意吧, 不要以为build过了就没事, 一些转换的坑在runtime等你呢(看上边的报错的注释吧). 拿不准就主动做个map吧.

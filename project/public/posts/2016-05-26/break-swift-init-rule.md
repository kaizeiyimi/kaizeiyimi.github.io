---
title: 对swift中单例的init搞破坏
date: 2016-05-26 11:41:02
tags: swift,iOS
---

swift的init方法十分严格, 需要先初始化自己声明的属性, 然后调用super.init, 最后做其他事情. init方法中不允许对象在没有初始化所有属性之前被作为参数使用. 但是我们有办法打破这个规则.

<!--more-->

虽然能打破规则, 但是程序也会卡住, 所以并没有什么x用.

show you the code:

```swift
class A {
	let sharedInstance = A()
	init() {
		test()
	}
}

func test() {
	print("enter")
	let _ = A.sharedInstance
	print("exit")
}

// first
A.sharedInstance

// second
test()
```

两种方式都一样, 都不会有`exit`的输出, 只是第二种会打印两次`enter`而已.

引发的问题的步骤是在`init`方法中调用一个不需要传递self作为参数的方法比如`test`, 这样就能编译通过, 然后在该方法里面访问单例. 只要调用`test`的`init`方法和单例初始化调用的`init`方法是同一个就一定会出问题.

以上调用导致`A`在初始化过程中被引用, 而引用时`A`的初始化方法还没有返回, 对象还没有初始化完成. 

然后整个线程就挂住了, CPU和内存利用率都不会有什么起伏. 在后台线程线程确认了一下, `MainRunloop`并没有在waiting. 当然, 任何一个线程访问`A.sharedInstance`都会导致那个线程卡住.

swift编译器对于这种问题应该不好查, 不过我倒是觉得运行时应该能检测到对象没初始化完成就被引用了, 然后给个crash, 而不是现在这样默默干等.

如果写单例, 注意一点儿哦~

![dog](dog.jpg)
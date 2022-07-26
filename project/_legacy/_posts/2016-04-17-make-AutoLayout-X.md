---
title: make AutoLayout X
categories: 技术
tags: [iOS, Github, swift]
date: 2016-04-17 11:34:24
---


其实挺不好意思的, 2年前的知识, 半年前的库, 现在才写下来. sigh...

简单说来就是一个小库: [XAutoLayout](https://github.com/kaizeiyimi/XAutoLayout).

<!-- more -->

## 陈年旧事
以前我吐槽了约束写起来太费劲, 布局很手动化, 几乎需要非常详细地指明每一个约束的每一个条件. 而这样的结果就是代码非常长, 阅读和理解都好困难, 看着打瞌睡. VFL? no kidding me again. 

反正好麻烦, 然后开源社区出现了一个库**Masonry**, 目的是简化代码写约束, 提供了链式语法以及一些helper方法. 当然本文不是要介绍它, 也不是要批评它, 只是吐槽而已, 后文再说. 本文主要是介绍我写的**XAutoLayout**😃. 

## demo code
使用起来还是比较方便的. 我定义了几个操作符`=/`,`<=/`和`>=/`, 分别与**xEqual**, **xLessOrEqual**, **xGreaterOrEqual**这几个方法等价, array仅支持`=/`, 对应的方法是`xEqual`的另一重载. 所有内部实现都没有使用定义的操作符.

```swift
xmakeConstraints(.RightToLeft, autoActive = true) {  // autoActive has a default value true
    v1.xEdge =/ [10,5,-10,-20] // can directly use number, the second view will be superview
    v2.xSize =/ [50, view.heightAnchor.xc(-50)] // can use iOS9 API

    // [v2.xTop, v2.xLeading] =/ [20, 10]  same as the below two lines
    v2.xTop =/ 20
    v2.xLeading =/ 20
}
``` 

## 面向接口编程

这个应该是swift最强调的了. 面向接口编程是大家都懂, 但又一般不这么干的一个编程准则. swift2以后给protocol加上了extension提供默认实现的能力, 让面向接口编程更加强大. 加上对之前写过的那个库不满意, 于是决定充分利用语言能力用纯swift重写一个. 

iOS9新增了一些`topAnchor`这样的API, 用来封装`item`和`attr`, 用起来比以前直观一些. 但是现在市面上更多的是base到iOS7, 有些是到iOS8, 这样的API就只能远观了. 虽然方便了一些, 但是因为这些东西还要考虑OC, 导致实际使用时看起来仍然比较冗长.

#### 想法的建立
一个约束到底要表达什么? 文档中的等式是这样:

```
  first.attr = second.attr * m + c
```

可以这样去拆分:
1. firstItem, firstAttribute
2. secondItem, secondAttribute
3. relation 
4. multiplier & constant & priority

对于倍数,偏移量和优先级都默认的情况可以这样书写:

```
  first.attr.relation(second.attr)
```

如果需要配置上述4里面的内容怎么书写呢? 有两种想法:

```
  // first type
  first.attr.relation(second.attr).m(1.2).c(10).p(750)
```

这样写看起来不错. 但是有两个问题:
* 链式表达式导致最终返回的仍然是一个我们自定义的对象, 想要拿到`NSLayoutConstraint`对象还需要再`.constraint`一下.
* 对复合类型不友好. 就是demo中看到的对Array使用`=/`的情况. 两个array是zip起来后遍历创建约束, 这时候只有两个参数, 不好配置m, c, p.

因此就变通了一下书写方法:

```
  // second type
  first.attr.relation(second.attr.m(1.2).c(10).p(750))
```

也就是把第4项的m, c, p 和 第二项的item和attribute结合在一起. 这样就演变成了

```
A relation B
```

这里又有两种做法:
1. A和B分别是两个类型, A可以做左值和右值, B只做右值. 毕竟B带着m, c, p去做左值确实不太好. 但是这样就有个问题, 想要支持直接用数字配置的时候, B怎么表达? 用AnyObject么? 
2. A和B分别是两个protocol, 这样避免了AnyObject的问题, 并且能对参数进行约束. 加上swift也是可以给已有类型写extension的, 所以用protocol抽象比较好, 参数不用是AnyObject那么宽泛.

#### 接口的规划
swift可以给`protocol`写`extension`来添加方法, Lib里面有一些逻辑不想暴露, 因为protocol extension里面一些方法调用了内部private的API, 并且这些调用会影响实现逻辑.

1. `XLeftItem`和`XRightItem`就分别是A和B, 并且A继承B. 
2. `XRightItem`有一个`xGenerateX`方法生成`XAttributeX`, 用来包含可选的`item`, `attr`以及`multiplier`,`constant`和`priority`. 这些属性都不对外暴露, 尽量让调用和接入简单. 况且暴露了的话, 亲不调我的API也能自己玩儿了, 那就没意思啦. 另外通过protocol extension添加了 `xm`, `xc`, `xp`三个方法的默认实现.
3. `XLeftItem`有一个`xGenerate`方法生成`XAttribute`, 用来包含不为空的`item`加`attr`. 也通过protocol extension添加了`xEqual`, `xLessOrEqual` 和 `xGreatOrEqual`方法的实现. 这三个方法就是调用了必须调用的内部private API, 嘿嘿.
4. 那个私有API其实就是调用了`XFirstItem`的`xGenerate`生成`XAtrribute`, 以及`XSecondItem`的`xGenerateX`生成`XAttributeX`, 然后读取两者的信息并做一些调整来生成约束.

虽然我已经为一些常用的类和protocol写好了extension, 比如`NSLayoutAnchor`, `UILayoutSupport`还有各种数字类型. 如果亲还有自己想要加入体系的类型, 只需要选择实现`XFirstItem`或者`XSecondItem`, 再添加`xGenerate`或者`xGenerateX`方法就可以了. `XAttribute`和`XAttributeX`都提供了初始化方法, 但是不暴露任何属性. 比如`NSLayoutAnchor`的扩展:

```swift
@available(iOS 9.0, *)
extension NSLayoutAnchor: XLeftItem {
    public func generateX() -> XAttributeX {
        let item = valueForKey("item")!
        let attr = NSLayoutAttribute(rawValue: valueForKey("attr") as! Int)!
        return XAttributeX(item: item, attr: attr)
    }
}

v1.xTop =/ v2.bottomAnchor.xc(10)
```

然后给UIView这样的主角需要的是一些property来表达`item + attr`:

```swift
extension UIView {
    public var xLeft: XLeftItem { return XAttribute(item: self, attr: .Left) }
    public var xRight: XLeftItem { return XAttribute(item: self, attr: .Right) }
    ... some more
}

```

然后`UILayoutSupport`也可以轻松加入:

```swift
extension UILayoutSupport {
    public var xTop: XLeftItem { return XAttribute(item: self, attr: .Top) }
    public var xBottom: XLeftItem { return XAttribute(item: self, attr: .Bottom) }
    public var xHeight: XLeftItem { return XAttribute(item: self, attr: .Height) }
}
```

因为一开始就考虑了要支持Array, 所以给UIView也加上了几个复合属性:

```swift
extension UIView {
    public var xSize: [XLeftItem] {
        return [xWidth, xHeight]
    }
    public var xCenter: [XLeftItem] {
        return [xCenterX, xCenterY]
    }
    ... some more
}

```

但其实可以随意组合, 比如:
```swift
[v.xTop,v.xLeading] =/ [10, 20]
```

array里面也能写nil, 表达这个位置不进行配置, 比如:
```swift
v.xEdge =/ [nil, 0, 0, 0] 
v.xHeight =/ 200
```
这样就表达了左下右三边紧贴父view, top不配置. 然后再给v设置高度为200.

## 嵌套书写
用`xmakeConstraint`创建约束时, 创建的语句是写在闭包里面, 并且还可以控制布局方向和是否自动激活. 也就是说闭包里面的约束是同一组, 接受同样的配置. but how? 

挠挠头, 因为创建约束的过程是内部控制, 我能准确地知道创建的时机, 因此我创建了一个私有上下文对象, 记录一组约束的配置信息, 闭包里面的约束都在这个上下文内根据方向去创建, 并决定是否直接激活. 

因为闭包里面还可以继续嵌套调用`xmakeConstraint`, 因此, 上下文需要做成栈, 每一次调用就push一个新的上下文, 调用结束就pop掉.

系统创建的约束默认是不激活的, 因此, 栈里面默认有一个方向是**LeadingToTrailing**, 默认不自动激活的上下文. 不在`xmakeConstraint`的闭包里, 而是直接裸写的约束才会使用这个上下文. 但这样带来一个小问题, 如果在闭包中调用了一个方法, 方法内部有裸写的约束, 则其实这些看起来裸写的约束也还是处在同一个上下文中. 因此最好都调用`xmakeConstraint`来写约束. 

## 方向
人类的语言有从左到右, 从右到左, 竖直方向还好都是从上到下. 所以苹果给了3个方向的选择: 分别是LeadingToTrailing, LeftToRight和RightToLeft, 表达是否由系统语言来决定布局方向. 这个参数是在VFL中使用, 而非VFL中是没法使用的. 

#### 存在的问题
提到方向就不得不多聊几句. VFL里面指定方向为明确的左到右或者右到左时, 创建出来的约束中, Leading和Trailing会根据方向被直接转换为**Left**或者**Right**. 还有一个小问题, 虽然转换了方向, 在计算坐标时仍然是从左向右, 从上到下. 平时使用时一般倍数都是1, 所以不会有啥影响, 只有倍数不为1时才有点儿秀逗. 主要原因是位置计算发生在firstItem和secondItem的最低公共父view的坐标系中, 层级关系不同可能导致参照系不同, 接着导致计算倍数时的基准值不同. 不过一般不建议给位置这样的attribute设置倍数, 否则结果可能完全不是你想象的.

还有一个变化是iOS9中对水平方向的attribute做了限制. 看一下exception的信息:
>  constraint cannot be made between a leading/trailing attribute and a right/left attribute. Use leading/trailing for both or neither.

也正如它所说, 只check水平方向的, 要么都是leading/trailing, 要么都是left/right. 如果是leading和top之类的它就不管... 不过讲真, 拿水平方向和垂直方向的位置属性做约束还是有点儿那啥...

#### 属性转换
`xmakeConstraint`方法有direction参数, 表达这一组约束的方向信息. 什么时候生效呢? 遵循VFL的做法, 仅当方向不为**LeadingToTrailing**并且attribute是Leading或者Trailing时才会将attribute转换为Left或者Right.

当然也不是遇到就转换, 条件还是有的. 再看看系统可能的行为: VFL可以指定方向, 但是受影响的约束的两个attribute肯定是水平方向的Leading/Trailing. 不用VFL时, 可以随意一些, 水平方向的属性可以和垂直方向的或者center等做约束. 也就是不用都是水平方向的属性. 同时iOS针对了少量的几种不配对情况抛出异常.

为了最大程度和系统行为一致, 创建约束时要先检查attribute是否能配对, lib里面主动抛出的异常就一个, 就是方向不为LeadingToTrailing并且只有一个属性是leading/trailing, 另一个不是水平方向属性. 这种情况下我不知道该不该转换, 而且这种情况用原生API是构造不出来的. 其他不配对的情况lib不处理, 留给iOS来让抛异常提醒你吧.

如果配对检查过了, 受RightToLeft方向影响的约束需要把constant 乘 -1. 

## 扩展数字类型
为了方便, 在设置位置类型的属性时, 可以直接设置数字, 这样secondItem就默认是firstItem的superView, 只要firstItem是一个UIview的话. 这就意味着数字也是`XRightItem`. 

swift里面有很多种数字类型, 我不得不对每一种都声明extension. 声明一个extension就需要写一次`xGenerateX`方法, 看起来好繁琐. 于是沿着这些数字实现的协议链往上找, 最终选择了扩展`SignedNumberType` 和 `UnsignedIntegerType`来实现`xGenerateX`. 这样所有的数字类型就都有了`xGenerateX`实现. 

## 吐槽Masonry
说实话, 第一次看这个库就觉得做复杂了. 而且一些想法挺奇怪的, 代码中还有一些欠考虑的地方, 分分钟出bug.

它创建约束的分组想法和我不一样, 它是针对每个view去写一组这个view作为firstItem的约束, 并且制约了裸写约束的可能性, 这样的好处是不用care嵌套的问题, 但是会导致书写的闭包很多.

它有个`MASLayoutConstraint`的类继承自`NSLayoutConstraint`,  make时生成的约束全都是这个子类. update和remake方法都只跟自己的体系玩儿, 这些操作只认这个类, 也就是说除非你关于这个view的所有约束都是用Masonry做, 否则update和remake方法没用. 对于有用到storyboard而只想用一个lib来简化部分约束编写的人来说, 只有make那个方法敢用. 

update这个方法会去查询**相似**的约束, 然后更新这个相似约束的constant而不是激活新的约束. 看Masonry的逻辑, 它把这个概念定义为除了constant以外其他属性全都相同的两个约束是相似的. 但是在AutoLayout里面根本就没有相似这个概念, 所以我觉得不应该生造出这么个概念. 而且约束是双向影响, 下面的两个约束是完全等价的:

```swift
v1.xTop =/ v2.xBottom.xc(10)
v2.xBottom =/ v1.xTop(-10)
``` 

这在Masonry里面却会被判定为**不相似**的约束.

 它的ReadMe里面有这么一句话:
> Alternatively if you are only updating the constant value of the constraint you can use the convience method mas_updateConstraints instead of mas_makeConstraints.

实际状况是, 如果在一个地方创建, 在另一个地方update, 这两处的first和second必须写得一样才行. 否则哪怕我只是更新constant, 就会因为约束用了另一个等价形式就会激活新的约束与旧的并存. 一般情况下这样都会导致约束冲突, 如果不能自动解决就crash了, 但不管怎样都不是开发者想看到的.

而且查找相似这个工作本来应该是要递归到window去的, 因为约束不是必须放在最低公共父view上. 不知道是不是因为考虑到了这个效率问题, 才决定只跟自己玩儿, 自己创建的约束, 自己找最低公共父view来激活, 记录下installed view, 然后更新的时候只在这个view上找相似.

remake方法是删掉有这个view参与的约束然后激活闭包里的约束. 实际使用起来会非常掣肘. 原因主要也是因为Masonry只跟自己玩儿.

Masonry为了能够支持各个类型的参数, 弄了一个`_MASBoxValue`的宏, 利用encoding来对值进行包装并返回id类型. 还用了黑魔法来改变建立关系的方法. 有人觉得挺牛逼的, 我觉得挺不好的. 见仁见智?

然后对于复合属性的支持也不怎么友好, 内部实现中弄了个delegate来把一个复合变成多个约束, 真心太复杂了. 

总之是觉得Masonry想的太多, 做得不好. 不过有些思路还是可以借鉴的, 比如利用编译器接受无参数有返回值的方法当readonly的property的getter调用这个tricky的地方, 用圆括号和`.`实现了链式调用语法.
```objc
// no property named test
-(BlockType)test;

// can be called like readonly property
xxx.test();
```
BlockType如果有参数和返回值, 这个`.()`调用的操作就能继续下去. 不过依赖这种编译器的tricky特性总觉得不安全.

仍然只支持iOS7, 导致不能用8才有的active属性来激活约束. 不过看Masonry的实现, 体系里面对最低公共父view依赖比较多, 就算到8也省不了多少代码.

## 写在最后
everyting start with `X`! 好吧, 我的想法也不一定对, 不一定好. 我只是客观地分析了Masonry, 吐槽不对的地方还请看客谅解. 我自己的库也不一定很好用, 虽然我自己一直在用~ 


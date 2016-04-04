---
layout: post
title:  "XLYAutoLayoutEasy"
date:   2014-12-08 16:00:00 +0800
categories: ios
tags: [GitHub iOS]
---


## AutoLayoutEasy简化代码描写约束

开发AutoLayoutEasy的目的是为了让代码编写AutoLayout更加方便直观, 提高可读性和可维护性. 因为我个人觉得iOS提供的创建约束的方式真心不敢恭维, NSLayoutConstraint的类方法写起来好长, VFL又不好操作具体约束, 写出来的代码可读性也不是很高.

## 如何创建一个约束

苹果在NSLayoutConstraint中提供了一个类方法

```objective-c
+(instancetype)constraintWithItem:(id)view1 
                        attribute:(NSLayoutAttribute)attr1 
                        relatedBy:(NSLayoutRelation)relation
                           toItem:(id)view2 
                        attribute:(NSLayoutAttribute)attr2 
                       multiplier:(CGFloat)multiplier 
                         constant:(CGFloat)c;
```

用于创建两个item之间的约束, 一次只能描述某两个属性的关系. 比如需要view1的left和view2的right保持10的偏移量. 那么这里的调用就是这样:

```objective-c
[NSLayoutConstraint constraintWithItem:view1 
                             attribute:NSLayoutAttributeLeft
                             relatedBy:NSLayoutRelationEqual
                                toItem:view2
                             attribute:NSLayoutAttributeRight
                            multiplier:1
                              constant:10];
```

好长有木有, 但是很清晰, 至少明确地表达了两个view的两个属性间的关系. VFL的描写方式就不写了. 这里获取到了一个constraint对象, 下一步我需要让它生效, 我需要找到一个view去调用`[view addConstraint:constraint]`, 这个view必须是view1和view2的一个公共父view. 完成操作后, 等到下一个刷新周期约束就会生效了.


## XLYAutoLayoutEasy

虽然创建约束的方法很直观, 但是我仍然认为它太复杂, 太长了. 屏幕杀手. 先看一眼我的lib如何描写一个约束.

```objective-c
  view1.layoutLeft.equalTo(view2.layoutRight).constant(10);
```

怎么看都更加简单. **简化约束的创建是XLYAutoLayoutEasy的核心**, 所有的约束创建都使用类似的方法. 如果firstItem和secondItem使用相同的layout属性, 可以不用书写secondItem的layout属性. 如下:

```objective-c
  //view1的宽度等于view2的宽度乘1再加上10
  view1.layoutWidth.equalTo(view2).constant(10);
```

如果是根superView的对应属性做约束, 甚至可以写成这样:

```objective-c
  //等同view1.layoutLeading.equalTo(superView.layoutLeading).constant(100);
  view1.layoutLeading.equalTo(100);
```

上面的单行代码创建的是XLYConstraint对象, 需要调用resultConstraint来获取NSLayoutConstraint对象.

XLYAutoLayoutEasy还顺带提供了一些helper方法, 辅助激活, 更新和重建约束. 

#### 批量创建约束
```objective-c
[UIView makeConstraints:^{
  testView.layoutTop.equalTo(self.topLayoutGuideView.layoutBottom).constant(50);
  testView.layoutTrailing.equalTo(self.view).constant(-50);
  testView.layoutLeading.equalToConstant(50);
  testView.layoutHeight.equalToConstant(100);
}];
```
使用makeConstraint的方法会自动将block里面创建的约束激活, 无需再自行寻找公共父view进行添加.

#### 更新约束
```objective-c
[UIView updateConstraints:^{
  self.testView.layoutLeading.equalTo(self.view).constant(100);
  self.testView.layoutHeight.equalTo(50);
}];
```
所有在updateConstraints里面创建的约束会首先查找有没有一个约束和创建出来的约束相似(后文会解释相似的判定), 如果有, 则修改constant, 否则添加新创建的约束. 
如果使用iOS的方法, 则需要记录下之前创建的约束来修改constant. 

#### 重建约束
```objective-c
[UIView remakeConstraints:^{  self.testView.layoutBottom.equalTo(self.bottomLayoutGuideView.layoutTop).constant(-100);
	self.testView.layoutWidth.equalTo(100);
	self.testView.layoutHeight.equalTo(100);
	self.testView.layoutLeading.equalTo(self.view.layoutLeading);
}];
```

方法会记录所有在remakeConstraints中出现的作为firstItem的view, 并把跟这些view相关的所有约束去掉(不包含hugging, compression resistance 的约束), 然后重新激活新创建的约束.

## 灵感

大前提是`translatesAutoresizingMaskIntoConstraints = NO`. 否则无法玩耍了. 既然使用了autoLayout就不要再搭着AutoResizingMask了.

简单描述一下XLYAutoLayoutEasy的设计灵感来源. 在storyboard中编辑一个约束时, 我发现xcode标注了firstItem, relation, secondItem, constant, priority, multiplier. 其中firstItem和secondItem显示的是view.width这样的形式, 整个约束看起来十分清晰. 于是想到如果能在代码里面用

```
view1.width equalTo view2.width, constant 50, priority 1000, multiplier 1
```

这样的形式描述那多好.一下就看明白了. 于是想到给UIView添加分类, 提供类似width, height, leading这样的property. 为了准确表达是布局的属性, 在前面添加了layout, 于是就成了layoutWidth, layoutHeight, layoutLeading. 没有添加xly_的前缀是为了书写方便.
 首先定义了最基础的API:
 
```objective-c
view.layoutWidth.equalTo(view2.layoutWidth);
```

关系有等于, 大于等于, 小于等于. constant, priority以及multiplier都有默认值, 分别是0, 1000, 1. 如果需要修改的话, 就在上面的表达式后面继续书写:

```objective-c
view.layoutWidth.equalTo(view2.layoutWidth).constant(100).priority(750).multiplier(1.5);
```

这三个属性书写的顺序可以随意交换.但是一定是在关系之后.

这样的形式更像c或者swift的语法, OC里面怎么做呢? 用block. block在调用时是block()的形式. 只要返回值可以使用`.` 进行调用的话这样的书写就没有问题. 因此就诞生了如下的方法:

```objective-c
	- (XLYConstraint *(^)(id attr))equalTo;
	- (XLYConstraint *(^)(CGFloat constant))constant;
```

用block作为返回值, 然后用()进行调用, 得到XLYConstraint的对象, 然后重复. 这样就能写出上面所展示的那种代码了. 我觉得这里如果用`[]` 进行方法调用的话, 可读性会比较差, 所以...

`view.layoutXXX`这样的属性是XLYViewAttribute类型, 调用equalTo等描述关系的方法后才产生XLYConstraint对象, 这样做一方面是为了从概念上区分出约束的item和其他参数, 另一方面也方便了代码的分布.

通过这样的调用最终生成的XLYConstraint对象记录了一个约束所需要的8个参数. 然后调用其`resultConstraint`方法将生成所对应的NSLayoutConstraint对象.

## helper方法

一个约束被创建后需要激活. ios7及以下系统需要自己寻找公共父view并添加, 因此我需要一个寻找两个view公共父view的方法. ios8及以上系统只需要设置active为YES即可.
在更新约束时, 我需要寻找到和当前约束'类似'的约束. 
在重建约束时, 我需要找到跟一个view相关联的所有约束.

以上就是make, update和remake所依赖的核心方法.

#### 激活约束
给NSLayoutConstraint添加了一个分类, 提供了xly_install 和 xly_uninstall方法来进行激活和移除操作, 方法中根据系统版本进行区别调用. 如果是ios8及以上只需设置active属性, ios7及以下则需要寻找最低公共父view来进行添加.

#### 更新约束
更新约束时, 首先是创建了在block里面书写的约束, 然后去寻找是否有一个相似的约束, 如果没有的话就直接激活约束, 如果有就替换constant的值.

什么是相似? 从NSLayoutConstraint中能看出来, 创建完一个约束后能修改的值只有priority和constant, priority还不建议在约束激活后再修改. 虽然经过测试发现只要优先级不是1000, 并且改动后的值也不是1000就没有问题, 否则崩溃. 这里尊重苹果的文档, 把优先级不同的约束当成不同的约束. 因此,相似的概念就是除了constant以外, 其他的值是**逻辑相等**的. 为什么不是完全相等? 因为约束并不是单向的, 它是一个双向的限制, 约束的公式如下:

```
view1.attr1 = view2.attr2 * multiplier + constant
```

这个计算规则等同于下面这一个:

```
view2.attr2 = view1.attr1 * ( 1/multiplier) - constant/multiplier
```

因此, 在寻找相似的约束时必须考虑第二种形式. 我定义相似的结果为3种, 相似, 逆向相似以及不相似. 查找时还得小心一种很特别的约束, 是通过设置view的hugging和compression resistance生成的. 这种约束的类是`NSContentSizeLayoutConstraint`, 需要过滤掉. 最后一个细节就是相似的约束可能不止一个, 这种情况下多半是代码有问题, 约束加多了, 但是不管怎么着, 我只取最新的一个, 即最后添加的那个, 因此我会倒序遍历constraints数组来进行查找.

#### 重建约束
重建, 就得先毁灭再重生. 应该被毁灭的是哪些呢? 我善做主张, 将所有关联的约束全部干掉. 比如代码这么写:

```objective-c
[UIView remakeConstraints:^{  
  self.testView.layoutBottom.equalTo(self.bottomLayoutGuideView.layoutTop).constant(-100);
  self.testView.layoutWidth.equalTo(100);
  self.testView.layoutHeight.equalTo(100);
  self.testView.layoutLeading.equalTo(self.view.layoutLeading);
  //这里不再多写了, view2也进行重建
  self.view2 ...
}];
```
block里创建了多个约束, 作为firstItem出现的是testView和view2, 因此所有和testView和view2有关联的约束全部干掉. 约束是双向的, 有关联就是约束的firstItem或者secondItem等于这个view. 在寻找关联的约束时只能从自己开始, 逐步往window遍历所有的约束, 将关联的约束记下. 这里本来想利用runtime去替换addConstant和setActive方法, 在方法中进行记录的, 但是发现了iOS的一些诡异得无法解释的现象, 放弃了这条路, 只能每次遍历查找了, 效率相对低点儿. 这里同样要去掉`NSContentSizeLayoutConstraint`类型的约束.

## 兼顾swift
以上的代码如果bridge到swift使用将显得很funny. 因为方法返回的是一个闭包, OC直接使用()就可以跟在后面继续调用, 但是swift会变成这样:

```swift
  view1.layoutLeft.equalTo()(view2.layoutRight).constant()(10)
```

因此, 我专门为swift添加了两个头文件, 使得swift里面也能跟OC的写法一样.

```objective-c
//其中一个, 另一个见代码
- (XLYConstraint *)equalTo:(id)attr;
- (XLYConstraint *)greaterThanOrEqualTo:(id)attr;
- (XLYConstraint *)lessThanOrEqualTo:(id)attr;
```

也专门弄了一个给swift bridge header用的`XLYAutoLayoutEasy-swift.h`以区分import的头文件.

## 总结

用helper方法配合简化约束的写法, 就能用较短的代码量写出我认为更加清晰可读的布局代码. 更新重建的操作也能更加容易. 

写代码, 多思考, 想清楚了需要什么再写. 多画图有助于思考.

另外, 感谢我的她对我的包容和支持.


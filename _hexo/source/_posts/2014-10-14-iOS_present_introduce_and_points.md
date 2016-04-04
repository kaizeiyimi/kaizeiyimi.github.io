---
layout: post
title:  "iOS present 场景切换的演化和要点"
date:   2014-10-14 14:30:00 +0800
categories: ios
tags: [iOS]
---

# Present的演化
iOS中的场景切换有多种方式, container内部的切换有UINavigationController的push pop操作, UITabbarController的tab切换. 外部的转换有popover(iPad专用), 和非常常用的present. 当然, UISplitViewController的replace在storyboard也被认为是一种切换(iPad专用, too). 本文将讨论present在不同版本的iOS SDK中的变化以及present的一些需要注意的问题. 本文的测试和讲述都是在xcode6.0.1中使用SDK8版本.

present是在app中可以帮助用户理解app行为, 划分app功能模块, 是一种极其常用的场景切换方式. 最常用的方式就是:

``` objc
[ViewControllerA presentViewController:ViewControllerB animated:YES completion:nil];
```

调用后会在A的上方展示B, 用户需要在B中进行一些操作才能会能回到A, 在B展示的期间, A不能直接与用户交互.

## segue from iOS5
在很久以前, present能够定制的地方很少, 展示的方式在iPhone尺寸上只能全屏, iPad有formSheet等可以进行非全屏的展示. 而动画则只能在4个默认设置中选择(直上直下, 反转, 翻页, 淡入淡出). iOS5开始提供了segue来抽象一个跳转, 可以创建自定义的segue去做动画, 但是这样的做法会导致场景切换的动画和切换的逻辑过程是分离的, viewWillAppear和viewDidAppear的调用时机是不正确的. 简单来说就是用动画模拟了切换的过程, 但其实切换是一瞬间, 一般实现是在动画结束的completion里面调用无动画的present. 先看看苹果给出的代码:

```objective-c
- (void)perform
{
// Add your own animation code here.
    [[self sourceViewController] presentModalViewController:[self destinationViewController] animated:NO];
}
``` 

如果按照苹果文档上给的代码去填上动画,  比如:

```objective-c
- (void)perform
{
    UIView *toView = [self.destinationViewController view];
    UIView *sourceView = [self.sourceViewController view];
    //寻找一个临时的view作为superview, 否则没有动画效果, 因为view不在window上
    [sourceView.superview addSubview:toView];
    toView.transform = CGAffineTransformMakeScale(0.5, 0.5);
    [UIView animateWithDuration:0.5 animations:^{
        toView.transform = CGAffineTransformIdentity;
    } completion:^{/* ... */}];
    [self.sourceViewController presentViewController:self.destinationViewController animated:NO completion:nil];
}
```

很不幸, 这个逻辑是有问题的. 问题就在addSubview那里. 为了做动画, view需要在window上, 而addSubview的时候toView进入window, 然后viewWillAppear和viewDidAppear就会立即被调用, 这中调用时机是不对的. 然后下面又立即做了present, SDK8中会得到这样一个warning: `Unbalanced calls to begin/end appearance transitions for <YourViewController: 0x7fc46bd7e860>.`

如果把present的语句放到动画的completion中, 没有warning, 但是viewWillAppear和viewDidAppear会在addSubview处连续调用一次, 然后动画结束时调用present又被连续调用一次, 导致各被调用两次. 注意这里**不会**调用disappear相关的两个生命周期方法. 是不是很无语? 而如果去掉addSubview的调用, 将没有动画效果.

网上有一些帖子里面的方法会在completion中, 在present之前多一个`[toView removeFromSuperview]`的调用. 很不幸, 这样带来的问题更多了, 在SDK8中,会得到willAppear, didAppear, 动画结束时得到willDisappear, willAppear, 没有didAppear! 然后又得到前文提到的warning. 这真是让人沮丧的事情.

所以我的建议是不要使用自定义的segue, viewController的生命周期完全得不到保障. 使用segue去模拟的方式会导致生命周期方法的调用和视觉过程不一致. 导致开发者在不同生命周期里配置的不同的逻辑的执行顺序和时机都不正确.

## Transitioning from iOS7
一个真正的场景切换对于目标viewController来讲应该是viewWillAppear, 然后动画, 然后才是viewDidAppear.  iOS7中提供了transition的概念, 用于给场景切换提供自定义动画. 这套机制把场景切换的过程进行了拆分, 将其中的动画部分交由开发者提供, present调用还和以前一样, 也仍然可以使用系统提供的segue(系统内部是正确的, 只是开发者没有办法), 只是在真正开始present流程前设置一下presentedViewController.transitioningDelegate = someDelegate. 这样保证了viewController切换时的生命周期调用时机, 而且也可以创造出各种各样的动画效果. 简单看看使用方式:

```objective-c
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    if (![segue.identifier isEqualToString:@"your present segue identifier"]) {
        UIViewController *viewController = segue.destinationViewController;
        viewController.transitioningDelegate = someDelegate;        
        //文档要求设置为custom才会根据delegate去获取自定义动画,实际测试结果是不需要设置也OK. 而且设置了反而会在ios8中产生另外的问题, 后文描述
        viewController.modalPresentationStyle = UIModalPresentationCustom;
    }
}
```

苹果的文档说明:
> Discussion
  When this view controller’s *modalPresentationStyle* property is *UIModalPresentationCustom*, UIKit uses the object in this property to retrieve the objects needed to present this view controller onscreen. The transitioning delegate must conform to the *UIViewControllerTransitioningDelegate* protocol. Its job is to vend the animator objects used to animate this view controller’s view onscreen **and an optional presentation controller to provide any additional chrome and animations**.

加粗的是ios8才有的. 下面是someDelegate实现的方法:

```objective-c
- (id<UIViewControllerAnimatedTransitioning>)animationControllerForPresentedController:(UIViewController *)presented presentingController:(UIViewController *)presenting sourceController:(UIViewController *)source
{
    return [CustomPresentAnimation new];
}

- (id<UIViewControllerAnimatedTransitioning>)animationControllerForDismissedController:(UIViewController *)dismissed
{
    return [CustomDismissAnimation new];
}
```

这里只是简单列举一下方法, 使用的动画对象没有自定义的属性因此就直接new了. 动画对象需要实现*UIViewControllerAnimatedTransitioning* 或者 *UIViewControllerInteractiveTransitioning* 协议, 后者从名字上能看出来是交互式切换. 从屏幕左边往右滑动去触发pop操作, 并且让UI跟随手指运动的切换方式就是交互式的.

```objective-c
- (void)animateTransition:(id<UIViewControllerContextTransitioning>)transitionContext
{
    UIView *containerView = [transitionContext containerView];
    UIView *fromView = [transitionContext viewForKey:UITransitionContextFromViewKey];
    UIView *toView = [transitionContext viewForKey:UITransitionContextToViewKey];
    [containerView insertSubview:toView atIndex:0];
    toView.alpha = 0;
    [UIView animateWithDuration:[self transitionDuration:transitionContext] animations:^{
        fromView.transform = CGAffineTransformMakeScale(1.5, 1.5);
        fromView.alpha = 0;
        toView.alpha = 1;
    } completion:^(BOOL finished) {
        [transitionContext completeTransition:YES];
    }];
}

- (NSTimeInterval)transitionDuration:(id<UIViewControllerContextTransitioning>)transitionContext
{
    return 1.0;
}
``` 

上面这段代码对于present或者dismiss都可以使用, 效果就是当前fromView会变大并变透明, toView会从透明到完全不透明. 更深入的用法以及交互式动画的控制这里不讨论, 苹果的文档和示例代码都有很好的说明. 

关于是否设置*UIModalPresentationCustom*的问题, 虽然文档要求设置, 但是测试是不需要. 如果设置了delegate并且使用*UIModalPresentationCurrentContext*, 会达到currentContext起作用并且自定义动画也起作用的现象. 算bug么? (关于currentContext的使用后文有介绍)

尽管在iOS7中开放了场景切换的动画控制, 对于present的一些需求仍然没有达到. 举一个简单的例子: 我不想在present调用后将presenter的View从window上移除, 因为我需要它作为一个背景, 就像iPad上的formSheet一样. 但是很遗憾, iPhone上不可以, presentingViewController的view会被移除, 当然你可以截屏, 但是无法同步内容了, 或者, 可以创建一个window, 指定一个相对较高的windowLevel, 将presentedController放到新的window中来达到需求(这也是我现在的做法...). 但是用window的麻烦就是不容易控制, app中其他的部分和这个viewController只有数据交互, viewController和view的层级结构被完全剥离了. 不是很好的解决方法.

## UIPresentation from iOS8
### UIPresentationController
iOS8中再次强化了present的使用. 普通的使用当然没有问题, 但是如果想更好地控制present的过程和细节, 那么iOS8中的UIPresentationController就是完成这个任务的. 它描述的是一个present从开始到结束的全过程, 这里不包含如何做过场动画, 但是有方法可以同其**交流**(后文会解释), 过场动画仍然由iOS7的方式来控制. 从开始到结束是一个怎样的过程? 是从某一个viewcontroller调用present开始, 一直到dismiss掉被展示的presentedViewController. 期间的大小变化, 布局等都属于这个过程的一部分. UIPresentationController提供的信息很多, 如:正在展示的和被展示的viewController, 展示的方式, 场景切换时的containerView, 然后是一些方法提供诸如是否需要移除presentingView, 是否全屏展示, 还有布局相关的一些回调和方法. 详细的内容和用法这里不赘述了, 可以看头文件以了解更多, 另一篇博客中会单独介绍.

要想使用UIPresentationController去控制present过程, 就需要将presentedViewController的*modalPresentationStyle* 设置为 *UIModalPresentationCustom*, 否则将不会尝试获取UIPresentationController的实例. 而是否有presentationController来控制present过程得到的效果也不一样, 最明显的一个就是默认不移除presenter的view. 只需要设置为*UIModalPresentationCustom*, 不需要设置transitionDelegate就可以看到效果. 但是如果不设置transitionDelegate而跑在ios7的设备中会得到如下warning: *UIModalPresentationCustom presentation style can only be used with an animator or with unanimated presentations.*  如果设置了delegate, 可以多实现一个方法去返回自定义的presentationController, 可以定制特别多的细节, 比如chrome和content的大小, 场景切换相关的附加动画. 

```objective-c
    UIView *dimView = [[UIView alloc] initWithFrame:self.containerView.bounds];
    dimView.backgroundColor = [UIColor colorWithRed:0 green:170 blue:170 alpha:0.8];
    dimView.alpha = 0;
    dimView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self.containerView insertSubview:dimView atIndex:0];

[self.presentedViewController.transitionCoordinator animateAlongsideTransition:^(id<UIViewControllerTransitionCoordinatorContext> context) {
        dimView.alpha = 1;
    } completion:nil];
```

iPad上formSheet弹出时周围不是变黑么? 这里的代码就是变成天蓝色. 注意那个animateAlongSideTransition方法, 这个方法的意思是block里地动画是和过场动画一起执行的, 测试了一下, 效果或者说实际做法就是把这个block加到了过场动画的block后面后组成一个新的block来做动画, 这就是前文所述的"交流". 开发中我有时候也会这样提供一些回调和设置来解决一些动画的同步问题. 还有一些关于size控制的就不多说了.

 除了开发者可以定制present过程, 苹果自己也对系统控件做了很多改造. UIPresentationController是一个父类, iOS自己实现了一些子类如私有的全屏展示Controller还有UIPopoverPresentationController, 而且将很多以前的控件进行了改造, UIAlertView, UIActionSheet, popover, searchDisplayController都被改造了. 苹果的工程师应该是这么认为的: 这些东西都是在现有的viewController上展示一些新的内容, 认为他们的行为其实就是present. 因此从iOS8开始我们多了UIAlertController来包含alert和actionSheet的展示, 并且是基于block的. popover不是提供新的viewController, 而是提供了一种展示方式`UIModalPresentationPopover` 以及 UIPopoverPresentationController来提供管理,  UISearchDisplayController被替换为UISearchController.(wwdc的视频里面, 工程师自喷了一下以前使用的是view, 通过addsubview去添加, 却要装得好像一个viewController, 说是付出了很多, 回报很少的样子...).

看苹果的意思是要用viewController来区分所有的场景, 并用presentation来管理场景切换(不包含容器内部的切换). 以前的alert和actionSheet的自己创建window, 以及UISearchDisplayController去addsubview的方式被否定了. 的确这是很不好的, 就拿UIAlertView来说, 因其自己处在一个独立的window中, 如果调用show的viewController消失了, 却没有设置alertView消失, 就会导致一个很尴尬的现象, 内容都没了, 你alert个啥呢? 而且, 如果alertView的delegate正好是这个viewController的话, 点击alertView的按钮还会导致崩溃, 因为delegate属性是assign不是weak (要注意, assign是正确的设计). 当然可以在viewController的viewWillDisappear或者dealloc等地方添加一下干掉alertView的逻辑, 但是这样就会给viewController添加变量了, 并且有时候会添加很多... 对于UIAlertView, 系统还有一个行为比较有意思, alertView可以在上一个没有消失的情况下继续弹出, 弹出时会暂时隐藏上一个, 待这一个处理完毕后再重新显示. 在弹窗正在展示的期间如果app切到后台, 再切回前台, alertView会重新从无到有的展示一次. 而换成alertController以后, 展示的其实就是一个看起来跟alertView一样的viewController, 系统是不允许一个presentingViewController同时present两个viewController的, 因此alertView的那种允许连续弹多个alert的有趣的现象没有了, 并且也不会在前后台切换时出现前述的重新展示的现象. 如果有人以前依赖了这些逻辑就一定要小心了, UIAlertController需要依赖一个viewController才能进行展示, 不能自行创建window进行展示. 也就不存在缓存之前的alert一说了.

### adaptive 自适应
这里补充说一点adaptive. 苹果对iOS8中所作的present的改动和自适应不同屏幕尺寸是有非常大关系的. 为什么允许在iPhone环境中也能使用popover和split? 其实在启用size classes后, 苹果期望开发者能更多地关注现在的尺寸中宽度和高度有没有被压缩,  *UITraitCollection* 描述了现在所处的环境, 包含宽度, 高度的情况, 屏幕的scale, 设备.(更多地细节看wwdc视频和文档). 在有size classes的情况下, 拿popover来举例, 同一段代码就可能允许于不同尺寸的设备中, iPad中宽度和高度都是正常, 能像期望地那样弹出popover, 效果不变. 而在iPhone中也就是宽度或者高度被压缩时, popover不能展示, 系统的UIPopoverPresentationController的默认行为是帮你改成全屏present. 如果你想再稍微定制下全屏展示时的样式比如添加一个navigationController来包含将要展示的viewController, 那么可以实现UIPresentationController的代理方法来提供调整:

```objective-c
//viewController中
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    if ([segue.identifier isEqualToString:@"popover"]) {
        UIViewController *viewController = segue.destinationViewController;
        viewController.presentationController.delegate = self;
    }
}

//代理方法
- (UIModalPresentationStyle)adaptivePresentationStyleForPresentationController:(UIPresentationController *)controller
{
//系统默认的应该是UIModalPresentationFullScreen, 没有over这个单词
    return UIModalPresentationOverFullScreen;
}

//must implement the above one to give a chance to call this one...
- (UIViewController *)presentationController:(UIPresentationController *)controller viewControllerForAdaptivePresentationStyle:(UIModalPresentationStyle)style
{
    UINavigationController *navVC = [[UINavigationController alloc] initWithRootViewController:controller.presentedViewController];
    return navVC;
}
```

如果不实现第一个方法的话就不会调用第二个代理方法, 虽然默认的也是全屏, 而且你只能返回全屏(有两个值都可以). 然后也要注意: **如果没有使用size classes, 只保留iPhone size时, 第一个代理方法返回UIModalPresentationFullScreen, 则不会调用第二个代理方法. 需要返回UIModalPresentationOverFullScreen才行**. 某种程度上可以认为是个小bug. 不过带over的变量是iOS8才有的, 理论上也应该使用新的变量才对. 

另外可以强制不使用adaptive, 只需要返回UIModalPresentationNone即可. 在压缩的空间内也可以展示为popover. 这点很好~

# Present 的一些要点
前面说了很多present的演化, 从segue到transition再到presentationController, 都是在加强present, 试图给开发者更多的空间. 下面说一些present的要点, 主要说一下present中viewController的层级结构以及如何修改确定层级关系.

当一个app运行起来, window上有一个rootViewController, 可能是一个NavigationController或者一个TabbarController, 我们可以进行push操作深入到一个ChildViewController中, 假如A->B->C, A是navigationController, push进入到C. 这时候我们在C上有一个需求需要present展示D. 这个过程需要知道一些viewController才能真正开始. 
1. presentingViewController: 这个present到底是谁在做支持?
2. presentedViewController: 这个present中被展示的是谁?
3. sourceViewController: 这个present是谁发起的?
要注意, source和presenting往往是不一样的. 在本例中, A最终会成为presenting, C是source, 而D是presented. 表示如下:
<pre>
D
|
A->B->C
</pre>

D现在是和A进行了关联, 形成了presenting和presented的关系. viewController有两个readOnly的属性, 分别是presentingViewController和presentedViewController. 前者是指当前viewController正在被谁展示, 后者是指正在被当前viewController展示的是谁. 这两个属性其实是计算属性, 他们都是递归往parent寻找, 直到找到真正在做present的viewController. 本例中在C的presentingViewController为nil, presentedViewController为D. 这个结果对于A, B, C都是一样的, 因为B和C都是A的childViewController. D的presentingViewcontroller则是A, presentedViewController是nil. 如果D也是一个容器, 假如仍然是navigationController, 那么D也push到E.
<pre>
D->E
|
A->B->C
</pre>
A, B, C, D的那两个属性的值都没有变化, E的presentingViewController是A, presentedViewController是nil. 我们可以在E上继续present到F, F再push到G.
<pre>
F->G
|
D->E
|
A->B->C
</pre>

这是D的presentedViewController就是F. 其余值也能响应推断出来. 

从另外一个方式来理解, present意味着展示新的模块, 新模块应该在逻辑上是另外一层, 默认情况下, present新的一层由当前层的根元素来操作. 所以是A展示了D, D展示了F. 为什么说是默认情况?  因为viewController还有一个属性:*definesPresentationContext*. 默认值为NO. 文档中描述如果值为YES, 意味着期望presentedViewController覆盖当前的view的范围. 直观地来讲, 就是viewController告诉系统, 当我或者我的childViewController做present时, presenting是我, 覆盖我的显示范围. 如果真的想要这样的效果, 还需要给presentedViewController设置*modalPresentationStyle*的值为*UIModalPresentationCurrentContext*, 指定presentedViewController在展示时使用当前的上下文. 

如果两个值都正确设置了, 当一个childViewController调用present时, 它首先检查自己, 然后递归检查parentViewController是否有谁的*definesPresentationContext*是YES. 这样会找到一个viewController来作为presenting, 然后present就是在这个viewController上做. 注意, 它有可能不是当前层的根, 也就意味着根仍然可以present. 根present的viewController的层级在child之上. 

如果没有同时达成上述的两个变量设置, 得到的结果就是默认由当前层的根进行present, 并且不以根的显示范围做控制. 这里有一个需要注意的: 如果在一个viewController (X)上设定了*definesPresentationContext*为YES, 并且presentedViewController (Y)设置了*modalPresentationStyle*为*UIModalPresentationCurrentContext*, 在Y上再次进行present时,  下一个presentedViewController (Z)**没有设置** 为*UIModalPresentationCurrentContext*的话, 展示会变成全屏, 此时的Z的presentingViewController变成了X. 更奇怪的是绑定的unwindSegue会莫名失效, 其它事件还能正确响应. 如果Z设置了*UIModalPresentationCurrentContext*, 则present覆盖的还是X的范围, presentingViewController属性指向的是Y.

## 总结
很乱有木有? 我也觉得很乱. 但事实就是这样. 苹果这次的iOS8升级带来的问题不少, 添加了size class来描述用户界面的变化, 顺便一提, 因为引入size class的概念, 转屏的方法也全部废弃, 改为响应尺寸的变化. 引入UIPresentationController进行present管理, 系统控件的展示也基本上都变成了present展示, 行为发生了大幅变化. *UIModalPresentationCustom*的设置与否会导致不同的结果. 允许adaptive特性来调整不同尺寸下地显示策略, 但是不兼容iOS7及以前的系统, 基本上都是些新的API和设计. 

稍微吐槽下: autoLayout的使用仍然有些问题, 有些设置不是在所有版本中都支持的, 虽然给出了warning, 但是没有建议如何修改. 使用autoLayout后的动画也有各种各样的问题, 给使用了autolayout的viewController做过场动画, 改变view的transform来完成效果. 如果使用currentContext的方式present 并且最终显示范围和viewController的初始大小不一致时, 会看到很好玩的结果. 动画效果完全就是打脸. 也尝试过给animation加上layoutSubViews的option, 然后又得到了另外一个打脸的动画效果. 分析了一下代码, 发现上述的改动总结起来就是先改动了transform让其缩放变小, 然后动画block中重设transform, 然后改变view的frame. 是的, 就是因为改变了frame导致了各种奇葩的效果, 有兴趣的自己试试就知道了. 还有很多其他的问题这篇博客就不在吐槽了, 再写就太长了.


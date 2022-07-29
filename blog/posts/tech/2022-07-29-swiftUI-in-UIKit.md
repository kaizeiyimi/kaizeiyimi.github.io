---
title: 在 UIKit 中使用 SwiftUI
date: 2022-07-29
tags: SwiftUI, iOS
---

`iOS13`首次推出了`SwiftUI`，当时`react`，`vue`这些声明式的前端框架已经火到爆，还有大神在造新的轮子，移动端也有`React-Native`，`Weex`，`Flutter`，`NativeScript`等也在搞声明式，不过他们的主要目标是跨平台。

`Apple`慌吗？慌吧？我觉得`Google`也慌。`2019年`苹果发布了`SwiftUI`，同年的`Google IO`上发布了`Compose Beta`，应该没商量过，不过也能看出来他俩挺着急的，首秀的自家框架超多`Bug`，管不了那么多了，**先上线**！

<!--more-->

------
## SwiftUI的问题

先不说有多少`Bug`，`SwiftUI`被集成到了`iOS`系统里，只能跟随系统升级来更新，这一点就很让人难受了。估计内部实现上有很多需要妥协的地方，性能啊，私有API啊什么的，不能像`SwiftNIO`那样开源。但这就让开发者发出了灵魂拷问：

> 要等到`iPhone 20`，我才能在生产环境中使用吗？

项目一般都需要兼容好几代`iOS`版本，3代不过分，4代很常见，5代不嫌多，再多不敢说。`SwiftUI`面世于**2019年9月**，按3代算，需要等到`iOS15`发布后半年多再去掉`iOS12`的支持，大约在春季，**2022年4月**。如果是兼容4代，就得等到**2023年4月**了。

本文撰写时，我司已经可以使用`SwiftUI`了🥳。但是，也只能用最早的`API`🥹。

有版本更新问题，就有兼容问题。看看文档，`iOS14`, `iOS15`修复了很多`Bug`，又提供了很多新的`API`，也废弃了一些`iOS13`的`API`，比如导航相关的设置，本来页面管理就不给力了，这下给本身就不富裕的家庭又增加了负担啊，兼容真的头疼。

我需要对导航的完全控制。我们经常会遇到一次性`push/pop`多个页面，或者对导航栈做替换等需求，`SwiftUI`的导航管理很难做到这些。

## App的页面管理
先对齐一下`App`是如何管理页面的。不管是前端还是移动端，关于`组件`、`页面`、`导航`的术语理解基本上是一致的。

* `组件`：一般指封装了一种交互或者小部分业务的视图元素。比如`Button`、`Switch`或者`XXXBusinessView`；
* `页面`：包含一个或多个组件，以及一部分业务管理的`大组件`，其实还是`组件`，比如`ProductDetailPage`、`HomePage`之类的，一般命名上和普通组件不同。
* `导航`：指页面之间的切换。从首页点击了某个按钮**进入**详情页的过程就可以说是导航。

我们通过某些交互，触发`导航`，导致`页面`变化，展示不同的信息（由`组件`构成）。在`UIKit`中，一个页面一般就是一个`UIViewController`，它比`UIView`多一些关于`页面`的生命周期和信息，`页面`一般也是继承自`UIViewController`，导航则是使用系统提供的各种容器，功能丰富，定制性强，`Tab`切换、`push/pop`，`modal`等方式应有尽有。最常用的就是`UINavigationController`，提供了导航栈管理。

看看`SwiftUI`中的导航，差强人意啊，分屏切换不好控制，导航栈必须用`NavigationLink`，代码控制导航的方式也有点儿绕。`iOS16`对`NavigationView`标记了废弃，然后提供了`NavigationStack`和`NavigationSplitView`分别处理导航栈和分屏。先不说这个`API`能不能解决问题，这种改变蛮难兼容，写法不一样，并且是页面管理相关，支持的功能还有差异，无法轻松满足合理需求。

## 思路
`UIKit`对于页面管理做得非常好，提供了多种容器，页面切换的过程也提供了很多定制`API`，让改变导航动画，使用交互式导航变得比较容易。既然如此，尝试一下继续使用`UIKit`来做页面管理？

`SwiftUI`有提供`UIHostingController`，一个继承自`UIViewController`，可以在内部渲染`SwiftUI View`的`UIKit`页面级组件。但是没有提供名字大概是`UIHostingView`的组件，推测是`SwiftUI`需要用到`UIViewController`的生命周期，单纯的`UIView`很难满足需求。

自行车有一辆就可以了，系统提供了`UIHostingController`，就已经给这个思路打好了基石。

## 方案探索
如果我们只是单纯的把一个`SwiftUI View`拿去创建一个`UIHostingController`实例，就像这样：

```swift
// DetailView.swift
struct DetailView: View {
  var body: some View {
    Text("detail")
  }
}

// HomePage.swift
let detailPage = UIHostingController(rootView: DetailView())

// we can push
push(detailPage)

// we can present
present(detailPage)
```

我们很容易就切换到了一个新的页面，这个页面的内容由`SwiftUI`编写。

但除了页面内容，我们还需要配置导航信息，比如配置`UIViewController`的`navigationItem`，可以在导航栏中显示当前页面的`title`，在左边或者右边放置多个按钮。我们试一下`SwiftUI`现有的`API`有没有效果：

```swift
struct DetailView: View {
  var body: some View {
    Text("detail")
      .navigationBarTitle("Noodle", displayMode: .inline)
  }
}
```
跑了一下，`title`能正常显示诶～但是(肯定有但是的)，`title`的显示时机不太对劲，`push`动画结束以后才显示。分析一下这个现象，很明显，`SwiftUI`里针对导航栏的配置最终是落地到了`UIHostingController`的`navigationItem`，不过这个`sync`动作发生的比较晚，页面都进入屏幕了还没做。这个效果别说**PM**和**设计师小姐姐**了，我都不能忍。

除此之外，我们也会关心页面的生命周期，比如`viewDidLoad`，`viewWillAppear`，`viewDidAppear`，`viewWillDisappear`，`viewDidDisappear`等，但`swiftUI`只提供了`onAppear`和`onDisappear`勉强覆盖了`viewWillAppear`和`viewDidDisappear`，有点捉襟见肘。

## 一个 protocol 和 UIHostingController 的子类
我们想保留简单的创建/导航逻辑，想拥有对`UIHostingController`实例的控制权，我们就需要让`DetailView`知晓`UIHostingController`的存在，并对其进行控制。

先做一个`protocol`:
```swift
public protocol StandaloneHostedView: View {
  func preconfigStandaloneMode(hostingController: UIHostingController<Self>)
}

public extension StandaloneHostedView {
  func preconfigStandaloneMode(hostingController: UIHostingController<Self>) {}
}
```

接下来，`UIHostingController`的初始化方法需要`View`，而`View`又需要配置`UIHostingController`。`UIHostingController`有一个`property`叫做`rootView`，它可以访问被`UIHostingController`管理的`View`，所以可以这样操作：
```swift
let detailPage = UIHostingController(rootView: DetailView())
(detailPage.rootView as? StandaloneHostedView)?.preconfigStandaloneMode(hostingController: detailPage)
```
但每次都需要做类型转换，还会给重构带来一些麻烦，另外`UIHostingController`在不同版本中的行为还有些差异，需要`workaround`，**继承**可以解决这个问题。
```swift
class StandaloneHostingController<Content: StandaloneHostedView>: UIHostingController<Content> {
  override init(rootView: Content) {
    super.init(rootView: rootView)
    // 
    rootView.preconfigStandaloneMode(hostingController: self)
  }
  
  required dynamic init?(coder aDecoder: NSCoder) {
    super.init(coder: aDecoder)
  }

  // workaround
  open override func viewDidLayoutSubviews() {
    // https://stackoverflow.com/questions/69265914/on-ios-15-the-uihostingcontroller-is-adding-some-weird-extra-padding-to-its-hos
    view.setNeedsUpdateConstraints()
    super.viewDidLayoutSubviews()
  }
}
```
虽然**继承**的名声有点糟糕，但榔头趁手更重要。系统提供的`UIHostingController`主要是用作`SwiftUI View`在`UIKit`中的容器，我们的`StandaloneHostingController`和`StandaloneHostedView`没在原有基础上增加多少负担，可能的使用方式如下：
```swift
// DetailView.swift
struct DetailView: StandaloneHostedView {
  func preconfigStandaloneMode(hostingController: UIHostingController<DetailView>) {
    hostingController.navigationItem.title = "Noodle"
  }

  var body: some View {
    Text("detail")
  }
}

// HomePage.swift
let detailPage = StandaloneHostingController(rootView: DetailView())

push(detailPage)
```
可以看到两处小变化：
1. `DetailView`把实现的`protocol`更改成了`StandaloneHostedView`，并增加了配置信息的`function`。
2. 使用的地方把`UIHostingController`改成了`StandaloneHostingController`。

在`preconfigStandaloneMode(hostingController:)`方法中除了配置`navigationItem`，还可以做很多其他事情，本质上这里就是`UIViewController`初始化的时机，可以利用`RxSwift`或者`Combine`等监听其生命周期，进而有机会做更多的事情。

## 继续探索
刚才的方案可以吗？看起来是可行的。但实际的工程会有更多`challenge`。如何利用`RxSwift`和`Combine`来监听生命周期，涉及到`OC`的一些`runtime`底层技术，容易出错；另外，`App`级别一般都会有一些基础组件，比如`BaseViewController`这种，提供一些基础的通用的配置，`App`内的其他业务组件应继承自这个`BaseViewController`。如果直接使用`StandaloneHostingController`，将无法方便地融入现有体系。

针对这个问题，`UIKit`也有解决办法，就是`childViewController`。我们可以像平时那样创建一个页面，内部把`StandaloneHostingController`作为`child`添加到页面。

先创建一个`Wrapper`，作为`parent`：
```swift
class WrappedStandaloneHostingController<Content: StandaloneHostedView>: BaseViewController {
  private(set) var hostingController: StandaloneHostingController<Content>!
  
  // 适当的时候调用此方法完成嵌入
  func loadHostigView(_ rootView: Content) {
    hostingController = StandaloneHostingController(rootView: rootView)
    addChild(hostingController)
    view.attach(hostingController.view)
    
    // what's this? 
    // `=/` 是一个操作符，这里就是让两个view的四边对齐
    hostingController.view.edgeAnchors =/ view.edgeAnchors
    hostingController.view.backgroundColor = .clear
    hostingController.didMove(toParent: self)
  }
}
```
然后是具体的页面：
```swift
final class DetailPage: WrappedStandaloneHostingController<DetailPage.ContentView> {
  func viewDidLoad() {
    super.viewDidLoad()
    // 这里就可以提前配置，不用在StandaloneHostedView里做
    navigationItem.title = "Noodle"
    // 假装有一个网络请求
    someRemoteRequest(completion: {[weak self] name in
      self?.loadHostigView(ContentView(name: name))
    })
  }
}

extension DetailPage {
  struct ContentView: StandaloneHostedView {
    let name: String

    var body: some View {
      Text("detail of \(name)")
    }
  }
}
```
这里没有再实现`preconfigStandaloneMode(hostingController:)`方法，因为`protocol`提供了默认实现，就是什么也不做。如果仍需要该方法，也是可以添加上的。

`DetailPage`就像平常使用的页面一样，外部调用上没有任何区别，只是内部使用了`SwiftUI`来完成`UI`绘制。这样就完成了由`UIKit`做页面管理，`SwiftUI`做页面实现的基础设计。

------
## 总结
可以看出`SwiftUI`底层的实现依然是`UIKit`，换句话说，`SwiftUI`就像一个属性/配置收集器，最后都翻译成了`UIKit`。没啥问题，`UIKit`打下的基础非常夯实，没有必要从头撸一套。但至少在页面导航这块我觉得设计得并不好。

站在`Apple`的立场，他们希望表面上`SwiftUI`就能搞定一切，不用非得去学习`UIKit`，以减少大家的学习成本。但现实状况是提供的`API`不够丰富，甚至有点穷酸，好多东西都需要依赖`UIKit`才能完成，因此他们又提供了`UIViewControllerRepresentable`和`UIViewRepresentable`，分别将`UIViewController`和`UIView`集成到`SwiftUI`中。

绕来绕去，根本问题还是`SwiftUI`不成熟，有些地方欠考虑。本来`API`就不够用，更新还和操作系统升级绑定，新的`API`只能新系统用，这更增加了普及难度。**2022年8月**了，我也只能用最初的`SwiftUI`，也只敢在那些`UI`结构相对稳定，交互相对简单的页面尝鲜。

本文只针对混搭做了一些尝试，除了本文描述的问题外，还有状态管理，信息传递等问题，在别的文章会继续探讨。而且`SwiftUI`的问题比本文提到的多得多，兼容性、稳定性、扩展性、可读性，我觉得都算不上好，不像`Apple`一直以来的高质量风格。但是，作为开发者，请忍😂。
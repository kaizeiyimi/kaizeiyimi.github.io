---
title: 代码中创建 DynamicColor 和 DynamicImage
date: 2022-08-16
tags: iOS
---

`iOS13`开始正式支持`Light/Dark Mode`，许多资源都需要准备两套，分别在`Light`和`Dark`模式中使用。在模式切换时，有`traitCollectionDidChange`的回调，同时也会触发组件的绘制/布局等方法，让我们有机会进行资源调整。对于**Color**和**Image**这两种非常高频的资源，系统也贴心地提供了自适应方案，在资源管理器`Assets`中可以编辑资源的属性，修改`Appearances`选项，就可以配置不同模式下的版本。

理想状况是所有资源都提前配置，用的时候非常方便，但实践中会有大量的情况需要从代码中创建资源，并需要支持不同的模式。系统给`UIColor`提供了`UIColor(dynamicProvider:)`方法，可以根据不同的`traitCollection`返回定制的颜色，但`UIImage`却没有？？

<!--more-->
## TraitCollection
`TraitCollection`描述了一个组件当前的运行环境，信息很丰富。其中的`userInterfaceStyle`描述当前是`Light`或`Dark`模式，`displayScale`描述显示倍率，`userInterfaceIdiom`描述UI风格，以及其他更多的信息。所以我们需要的其实是针对不同的`TraitCollection`提供相应的资源。

## DynamicColor
`iOS13`提供的`API`是`UIColor(dynamicProvider:)`，参数是一个回调，让我们根据传入的`TraitCollection`返回颜色：
```swift
UIColor(dynamicProvider: { trait in
  return trait.userInterfaceStyle == .dark ? darkColor : lightColor
})
```
一般情况下我们只关注`userInterfaceStyle`就足够了。所以，可以稍微封装一下：
```swift
extension UIColor {
  static func dynamic(_ defaultColor: UIColor, variants: [UIUserInterfaceStyle: UIColor]) -> UIColor {
    return UIColor(dynamicProvider: { trait in
      variants.first{ trait.userInterfaceStyle == $0.key }?.value ?? defaultColor
    })
  }
}

let color = UIColor.dynamic(defaultColor, [.dark: darkColor])
```

## DynamicImage
`iOS`没有给`UIImage`提供类似的接口🥹。翻阅文档，找到了`UIImageAsset`，可以为不同的`TraitCollection`注册`image`，也可以根据`TraitCollection`**计算**`image`。
```swift
// Images returned hold a strong reference to the asset that created them
open func image(with traitCollection: UITraitCollection) -> UIImage 

// Adds a new variation to this image asset that is appropriate for the provided traits. Any traits not exposed by asset catalogs (such as forceTouchCapability) are ignored.
open func register(_ image: UIImage, with traitCollection: UITraitCollection) 

// removes only those images added with registerImage:withTraitCollection:
open func unregister(imageWith traitCollection: UITraitCollection) 
```
注意到第一个方法的注释，生成的`image`拥有`asset`的强引用，而且这个方法的文档说如果不能精确匹配，则会返回最接近的（**best match**）。我们可以构造一个`asset`，然后注册一些`image`，如果系统能根据`asset`和`traitCollection`自动调用第一个方法，那么问题是不是就解决了？

试一下之前，还需要注意`register`方法的文档：
> The trait collection must always contain an explicit value in its **displayScale** property. You may experience unexpected results from `image(with:)` if the trait collection does not explicitly define the desired scale.

(呵，关键的信息一些在文档，一些在注释。。。

一般来讲，我们关注的主要是`displayScale`、`userInterfaceIdiom`和`userInterfaceStyle`，可以写一个`DynamicMeta`用作属性收集：
```swift
public struct DynamicMeta<T> {
  var value: T
  var traitCollection: UITraitCollection
  
  public init(_ value: T, traitCollection: UITraitCollection) {
    self.value = value
    self.traitCollection = traitCollection
  }
}

extension DynamicMeta where T: UIImage {
  public init(
    _ image: T, scale: CGFloat? = nil, 
    idiom: UIUserInterfaceIdiom = .unspecified, 
    style: UIUserInterfaceStyle = .unspecified) {
    
    self.value = image
    self.traitCollection = UITraitCollection(traitsFrom: [
      UITraitCollection(displayScale: scale ?? image.scale),  // 必须给出 scale
      UITraitCollection(userInterfaceIdiom: idiom),
      UITraitCollection(userInterfaceStyle: style)
    ])
  }
}
```

然后可以写一个静态方法用于创建：
```swift
extension UIImage {
  public static func dynamic(_ defaultImage: UIImage, variants: [DynamicMeta<UIImage>] = []) -> UIImage {
    let asset = UIImageAsset()
    let list = (variants + [DynamicMeta(defaultImage)])
    list.forEach{
        asset.register($0.value, with: $0.traitCollection)
    }
    let image = asset.image(with: UITraitCollection.current)
    return image
  }
}
```
注意最后返回的`image`是**计算**得到的，这样一方面可以立即获取符合当前`traitCollection`的图片，另一方面也自动设置好了`image`和`asset`之间的关联(strong reference)。

给`UIImageView`用一下试试：
```swift
let lightImage = codeGeneratedRedImage
let darkImage = codeGeneratedPurpleImage

// make a dynamic image
let image = UIImage.dynamic(
  lightImage, 
  variants: [DynamicMeta(darkImage, style: .dark)])

// set to imageView
someUIImageView.image = image
```
切换`Light/Dark`模式时，红色变成了紫色！

同样的，可以创建另一个动态图片作为`highlightedImage`，也一切正常～

## 有一个问题
`SwiftUI`里面正常吗？🤔

不，不正常。

......

当我们使用`SwiftUI`的`Image`组件时：
```swift
Image(uiImage: dynamicImage)
```
图片会保持为最初计算出的那张，也就是如果一开始是红色或紫色，那么不管怎么切换，都是那个颜色。

不清楚`SwiftUI`底层是怎么做的，推测内部实现可能没有使用`UIImageView`。不过系统提供了`UIViewRepresentable`协议，可以把`UIView`嵌入到`SwiftUI`中，另一个`UIViewControllerRepresentable`则可以嵌入`UIViewController`。

```swift
public struct ImageView: UIViewRepresentable {
  public typealias UIViewType = UIView
  
  private let image: UIImage
  private let highlightedImage: UIImage?
  private let isHighlighted: Bool
  
  public init(_ image: UIImage, highlightedImage: UIImage? = nil, isHighlighted: Bool = false) {
    self.image = image
    self.highlightedImage = highlightedImage
    self.isHighlighted = isHighlighted
  }
  
  public func makeUIView(context: Context) -> UIView {
    // must wrap in a view or else layout will be unexpected.
    let box = UIView()
    let imageView = UIImageView()
    box.addSubview(imageView)
    imageView.frame = box.bounds
    imageView.autoresizingMask = [.flexibleHeight, .flexibleWidth]
    return box
  }
  
  public func updateUIView(_ uiView: UIView, context: Context) {
    let imageView = (uiView.subviews[0] as! UIImageView)
    imageView.image = image
    imageView.highlightedImage = highlightedImage
    imageView.isHighlighted = isHighlighted
  }
}

// use it
struct ContentView: View {
  let image = someNormalDynamicImage
  let highlightedImage = someHighlightedDynamicImage
  
  @State var isHighlighted = false
  
  var body: some View {
    Image(uiImage: image)
      .frame(width: 50, height: 50)
      .onTapGesture(perform: { isHighlighted.toggle() })
  }
}
```

示例展示了如何将`UIImageView`嵌入到`SwiftUI`中，只简单处理了常见场景。需要注意在`makeUIView(context:)`方法中，我们将`UIImageView`包在了一个普通的`UIView`中，这是为了绕开直接使用`UIImageView`产生的一些奇怪`bug`。

## 扩展 DynamicColor
在`DynamicImage`方案中，我们用`DynamicMeta<T>`当作属性收集器，描述资源和`TraitCollection`的对应关系。所以`DynamicColor`也可以使用它：

```swift
extension DynamicMeta where T: UIColor {
  public init(_ color: T, style: UIUserInterfaceStyle = .unspecified) {
    self.value = color
    self.traitCollection = UITraitCollection(userInterfaceStyle: style)
  }
}

extension UIColor {
  public static func dynamic(_ defaultColor: UIColor, variants: [DynamicMeta<UIColor>]) -> UIColor {
    return UIColor { trait in
      variants.first{ trait.containsTraits(in: $0.traitCollection) }?.value ?? defaultColor
    }
  }
}
```

## 总结
收刮`Apple`散落各处的文档和注释，试验出的这个结果不知道能保持多久，如果有一天这个方式不可用，也不用太担心，我们可以利用一些`runtime`手段在`traitCollectionDidChange`方法中注入一点逻辑，手动处理图片。最多就是自动驾驶变脚蹬子而已。
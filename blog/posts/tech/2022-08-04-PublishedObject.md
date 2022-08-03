---
title: 制造一个 @PublishedObject
date: 2022-08-04
tags: SwiftUI, Combine
---

在`SwiftUI`中，`PropertyWrapper`随处可见。每种都有各自的职责，背后的逻辑和内存管理也有所不同。随着升级，`SwiftUI`也逐渐增加了一些新的`PropertyWrapper`，但实践中发现，有一种需求一直没有被满足，那就是`@PublishedObject`（根据`SwiftUI`的命名风格，我自己起的😅）。

<!--more-->

`SwiftUI`提供了一个`protocol`叫做`ObservableObject`，和两个`PropertyWrapper`分别是`@Published`、`@ObservedObject`来处理外部对象的变化。当外部对象的**状态**发生变化时，`View`能够获取到**通知**，从而更新自身绘制。

关于这三者的介绍，可以参阅该帖[What is the @ObservedObject property wrapper?](https://www.hackingwithswift.com/quick-start/swiftui/what-is-the-observedobject-property-wrapper)。

借一点点人家的示例代码：
```swift
class Order: ObservableObject {
  @Published var items = [String]()
}

struct ContentView: View {
  @ObservedObject var order: Order

  var body: some View {
    // your code here
  }
}
```
`Order`类型实现了`ObservableObject`协议，其`items`属性使用`@Published`标记，`ContentView`通过`@ObservedObject`监听`order`的变化，当`items`发生变化时，`ContentView`就会收到通知，然后更新重绘。

`SwiftUI`在背后做了大量的工作，让一个值的变化最终引起一个或多个视图的更新。

## 不足
`@Published`只能为`值类型`标记，或者准确一点，它只关注被包装的**值**是否发生变化。如果本来就是`值类型`，比如例子中的`items`，对数组进行添加/删除就是直接改变了**值**。

如果是`引用类型`，比如:
```swift
class Customer {
  var isVIP: Bool = false
}

class Order: ObservableObject {
  @Published var items = [String]()
  // try this
  @Published var customer = Customer()
}
```
当`isVIP`变化时，`customer`属性的**值**没有变化，因为这个**值**本质上就是一个引用，一个指针，一个`Int64`，它没有变，变的是它指向的另一片内存。

## 提案里的方法
日常的`PropertyWrapper`并不复杂，甚至可以简单到这样：
```swift
@propertyWrapper
struct MyWrapper<Value> {
  var wrappedValue: Value
}

class MyObject {
  @MyWrapper var value = "hello world"
}
```

日常模式下，`PropertyWrapper`和包含它的类型之间是独立的，也就是说`@MyWrapper`和`MyObject`没有关联。但很多时候，我们需要一点联系，比如`@Published`和`ObservableObject`，需要一种方式将他们的变化关联起来。

官方文档并没有提到`@Published`和`ObservableObject`是怎么工作的。查阅[PropertyWrapper Proposal](https://github.com/apple/swift-evolution/blob/master/proposals/0258-property-wrappers.md#referencing-the-enclosing-self-in-a-wrapper-type)有提到`propertyWrapper`的另一种使用方法：提供一个静态的下标访问方法，参数列表中就有包含自身的`实例`引用，但这个方式只能在`引用类型`内部使用。合理推测一下，`@Published`和`ObservableObject`会不会就是这样关联起来的？

```swift
static subscript<T>(
  _enclosingInstance instance: T,
  wrapped wrappedKeyPath: ReferenceWritableKeyPath<T, Value>,
  storage storageKeyPath: ReferenceWritableKeyPath<T, Self>
) -> Value
```

苹果实现的这个下标方法，和提案的方法签名略微不同，这没关系，但关键的是`_enclosingInstance`是以下划线开头，不是`public`，文档里也确实没找到这个方法的相关信息。不过这也不算使用`私有API`，使用下划线开头，可能意味着苹果没有完全确定其实现，存在变化的可能性。

## @PublishedObject
我们可以利用这个下标方法来实现`@PublishedObject`。talk is cheap, show you the code.
```swift
@propertyWrapper
public struct PublishedObject<Value> where Value: ObservableObject {
public static subscript<T: ObservableObject> (
  _enclosingInstance instance: T,
  wrapped wrappedKeyPath: ReferenceWritableKeyPath<T, Value>,
  storage storageKeyPath: ReferenceWritableKeyPath<T, Self>
) -> Value where T.ObjectWillChangePublisher == ObservableObjectPublisher {
  get {
    let value = instance[keyPath: storageKeyPath].value
    if instance[keyPath: storageKeyPath].cancellable == nil {
      instance[keyPath: storageKeyPath].cancellable = value.objectWillChange
        .sink(receiveValue: {[weak instance] _ in
          instance?.objectWillChange.send()
        })
    }
    return value
  }
  set {
    instance[keyPath: storageKeyPath].cancellable?,cancel()
    instance[keyPath: storageKeyPath].cancellable = nil
    instance.objectWillChange.send()
    instance[keyPath: storageKeyPath].value = newValue
  }
}

  @available(*, unavailable, message: "@PublishedObject can only be applied to classes")
  public var wrappedValue: Value {
    get { fatalError() }
    set { fatalError() }
  }

  private var value: Value
  private var cancellable: AnyCancellable?

  public init(wrappedValue: Value) {
    value = wrappedValue
  }
}
```

`Wrap`起来的`value`，类型是`ObservableObject`，包含该`@PublishedObject`的`instance`的类型也是`ObservableObject`。当第一次访问时，`getter`中会建立起`value`和`instance`的变化关联。`setter`是替换掉`value`，那么原来建立好的关联就无效了，需要重新建立。只在`getter`里建立联系，是因为如果都不访问`value`里的属性的话，这个关联就是多余的。

提案里面有这样一段话：
> This extension is backward-compatible with the rest of the proposal. Property wrapper types could opt in to this behavior by providing a static subscript(instanceSelf:wrapped:storage:), which would be used in cases where the property wrapper is being applied to an instance property of a class. If such a property wrapper type is applied to a property that is not an instance property of a class, or for any property wrapper types that don't have such a static subscript, the existing wrappedValue could be used. One could even allow wrappedValue to be specified to be unavailable within property wrapper types that have the static subscript, ensuring that such property wrapper types could only be applied to instance properties of a class

如果没有被`引用类型`使用，或者没有提供下标方法，则继续使用`wrappedValue`。我们可以给`wrappedValue`标记上`unavailable`来保证只能在`引用类型`中使用。

现在我们可以这么做了：
```swift
class Customer: ObservableObject {
  @Published var isVIP: Bool = false
}

class Order: ObservableObject {
  @Published var items = [String]()
  //
  @PublishedObject var customer = Customer()
}
```
当`customer.isVIP`变化时，会引发`customer`变化的通知，然后通过`@PublishedObject`中建立的关联，再引发`order`变化的通知。

## 总结
在这个场景中嵌套的`引用类型`需要是`ObservableObject`，毕竟我们是想扩展现有体系，用`ObservableObject`最符合场景也最方便。

以后这个方法可能会**转正**，并且被去掉的可能性应该很低。万一苹果就是不让开发者用，就自己爽，我们就需要在一些合适的时机，比如`init`去手动建立关联。真有那一天，就是自动驾驶变脚蹬子，会增加一些重构负担，但不影响工程架构。
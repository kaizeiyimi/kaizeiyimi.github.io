---
layout: post
title:  "XLYMapping System"
date:   2014-10-09 18:00:00 +0800
categories: 技术
tags: [Github,iOS]
---

[XLYMapping]: https://github.com/kaizeiyimi/XLYMapping/
[restkit]: https://github.com/RestKit/RestKit/
[AFNetworking]: https://github.com/AFNetworking/AFNetworking/

[XLYMapping] 是一个能够将JSON对象(NSDictionary或者NSArray)映射到本地对象的库. 可以简化从服务端请求到数据后的字段填充操作. 当然, 它是本人开发的😃.

很早以前(一年多)接触了[restkit], 它很强大, 针对 restful 的API封装了网络请求, JSON对象的映射, 包括普通对象和受管对象(`NSManagedObject`), 并且对受管对象还额外提供了许多便利的方法. 它集成了[AFNetworking]这个公认很好的网络库来提供网络请求, 使得使用restkit的开发者能够极大得减少请求和数据转换的代码量.

随着时间迁移, 我对它的看法持一些保留态度了. 不是说我觉得他不好, 我只是感觉它太想做得大而全了. 我对它的架构并没有做过特别深入的研究, 只是使用了将近1年的时间, 而这期间接触最多的是映射系统. 因为我们的app需要同服务端做特别多的请求, 对应的元数据的种类也特别多, 经常还会遇到一个接口下发完全不同的数据, 还好有restkit提供的丰富的mapping方式, 让我们能够hold住各种奇葩的需求. 除了映射系统, restkit还提供了一些友好的接口来生成请求对象, 管理请求队列, 路由等, 还有一些`CoreData`的支持, 以及`search, testing`等(这两个我没有研究过).

我觉得它太复杂了. 我曾经想把它的映射系统扒出来, 很快就放弃了. 想扒出来的原因是这样: 首先, coreData我比较熟悉, restkit提供的关于coreData的操作我很多都用不上. 其次, AFNetworking升级到了2.x, 架构进行了大调整, 加入了`NSURLSession`的支持, 我想用, 但是很遗憾, restkit在集成AFNetworking时没有进行命名替换, 加上OC一些自身的原因, 想要使用2.x版本的AFNetworking很不方便. 最后, app本身一般都不会太复杂, restkit提供的功能至少在我所开发的几个app中太重量级了, 对我而言真正用得上的就是映射系统. (还有一些原因就不方便在这里说了, 😝)

这个国庆打算和一个同学开发一个app玩儿, 正好也就想自己实现一个映射系统, 我可不想在一个那么简单的app里面使用restkit... 我一直都不喜欢把东西搞得太复杂, 架构的美就在于足够简单又能够轻易扩展和修改. 于是花了2天左右完成了开发, 后面又根据需求做了一些调整, 支持映射到字典, 再后来还改了一点儿东西来支持在swift里面使用, 虽然要付出一些代价.

代码可以看我的[XLYMapping repo][XLYMapping], 总之, 整体的设计思路其实很简单, JSON对象是树形结构, 于是我也用树型结构来映射, 基本上是个深度优先的递归. 

1. 有willMap的回调以修改将要进行映射的JSON对象, 返回nil将取消映射. 也有dynamic mapping的回调允许用户临时更换mapping规则. 
2. 抽象了每一次的map操作, 允许做关系映射--将一个对象映射为另外一个对象的属性, 用户自定义转换映射--由用户自己进行某段JSON的映射, 或者默认映射--啥也不改. 
3. 每映射一次都会对结果进行校正, 一方面避免KVC设置值时对象的类型不匹配, 另一方面过滤null值.

架构是支持扩展的, 现阶段没有暴露继承用的method, 受管对象的映射也是继承自普通对象的映射并且写到一个文件里面的. 接口很简单, 同一个映射目的可以用不同的方式来组合, 功能还是很强大的. 使用方式和restkit的很相似, 毕竟也受到了一些启发. 使用说明请参考[XLYMapping].

也做了一些简单的性能测试, 映射的方式和restkit基本一样(目标对象的层次结构, 映射的规则). 我们有一个接口可以返回5000个数据, 每个数据有15个基本属性, 有1个嵌套的对象(使用relationshipMapping), 4个使用keyPath访问的属性, 还有一个使用自定义映射构建的属性, 对于每个数据,需要创建2个对象并对24个属性进行映射. 量还是不小的, 5000个数据, iPhone4s用了2.55s. 模拟器使用MAC的CPU则花了0.21s. 犹记得当年我们1000个数据, 在ipad2上使用restkit的mapping花了1分多钟...(那是那个年代的事情, 过了一年了应该有改善吧?😜)

在swift里面也尝试了一下. 不得不吐槽一下苹果, 你XX的, swift里面kvc和kvo弱爆了, 到处都是坑, 而且一些runtime的特性也被封杀和调整了, 就算用OC编写再用bridge header暴露给swift用也存在很多问题, 这里就不详细吐槽了😩. 如果很喜欢我这个小库, 一定想要在swift里面应用的话, 请看[XLYMapping]里面的解释, 希望使用愉快.

总之欢迎使用和拍砖. 我的小app已经用这个`mapping system` 和 `AFNetworking 2` 架构起来了, 整个http请求层的核心代码不到200行. 爽到不行啊~

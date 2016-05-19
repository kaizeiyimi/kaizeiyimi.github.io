---
title: 复用内部公用代码的几种方式
categories: [技术]
tags: [iOS, cocoapods, workspace]
---
一般来讲, 总是会有一些内部私有代码是有复用价值的, 比如一些Utils方法, 一些公用的UI组件, 一些对各种框架或者库的封装. 本文介绍几种复用的方式, 分别是使用多target, 使用workspace集成多个project, 以及利用cocoapods来集成私有代码. 每种方式都各有利弊, 没有最好, 只有合适.
<!--more-->

假设我们已经知道哪些代码是公用的, 并且已经拆分完毕, 现在我们有多个逻辑模块, 一个是`Common`表示公用的代码, 其他是`A`, `B`等, 表示依赖`Common`的模块. 为了方便, `Common`简写为`C`, 而且假设上层模块只有`A`和`B`, 公用代码只有一个`C`.

稍微有点儿样子的工程, `C`一般都是有第三库依赖的, 也就是说`A`, `B`, `C`都有各自的第三方库依赖, 如何处理依赖冲突也是需要考虑的.

# 一个repo管理
一个project多target, 和一个workspace多project没有太大区别, 这里讨论放在一个repo里面管理的情况. 多个repo的情况就需要用git submodule, 更新比较麻烦, 后文再谈.

### 多target
XCode支持在一个project中创建多个target, 我们可以把`C`的代码放置到`targetC`中, `A`和`B`的代码分别放置到`targetA`和`targetB`中. `targetC`配置为输出framework或者static lib, 而`A`和`B`都链接`targetC`. 

### 多project
Xcode也提供了多个工程整合的方式, 即使用workspace. 我们把3个模块的代码放置到3个不同的工程, 然后都添加到同一个workspace中, `C`仍然输出framework或者static lib, `A`和`B`需要动点儿手脚才能正确添加`C.framework`作为其embed framework.

估计是xcode的bug, 添加embed framework时路径是绝对路径, 不过可以直接编辑工程文件来修改, 也可以绕一下, 让`C`编译完成后copy包到某一个相对路径, 比如`C`的工程目录下, 然后再引入此包. 这样不管什么scheme编译完成都会直接覆盖此包, 保持最新. `A`和`B`还需要配置一下scheme来保证每次build前都要先build `C`.

### 分析
此种方法最简单, 更新代码的时候非常方便, `C`中开发了新代码, 可单元测试, 也可立即和`A`或者`B`联调, 因为它们在一个project里面, 所有改动都是立即可见的. 这一点对代码持续演进和集成非常友好.

`C`有自己的第三库依赖, 我们一般采用cocoapods管理, 这里比较特殊的一点是`C`自己也是个lib, 当我们用framework时不能在`C.framework`中嵌套embed的framework, 可以观察`targetC`的build phase, 并没有`Embed Pods Frameworks`. 就算我们手动加上, 也就模拟器能正常, build到设备上依然要挂, 提示`no suitable image found`, 然后巴拉巴拉. 所以我们需要考虑解决依赖的问题. 目前cocoapods已经发布1.0版本, 我的解决办法是使用`abstract_target`:

```ruby
abstract_target 'common' do
	pod 'Alamofire'
	pod 'RxSwift' 
	
	target 'A' do
	  workspace 'my.workspace'
	  project 'A/A.xcodeproj'
	  pod 'RxCocoa'
	  pod 'XAutoLayout'
	end
	
	target 'B' do
	  workspace 'my.workspace'
	  project 'B/B.xcodeproj'
	  pod 'Socket.IO-Client-Swift'
	  pod 'XAutoLayout'
	end

	target 'C' do
	  workspace 'my.workspace'
	  project 'C/C.xcodeproj'
	end
end
```
`common`作为parent target并且是个抽象的, 也就是说不会真正有这么个target存在, 但是parent的身份让内部的`A`, `B`和`C`这几个target都继承pod配置. 因此, 这里`common`描写`C`需要的库, 而不是在C那里单独配置, 否则`A`将不能正确处理`C`的依赖. 

这里还涉及到依赖的冲突, `A`依赖的`RxCocoa`依赖了`RxSwift`, `common`里面也描述了依赖`RxSwift`, 继承后只要pod能正确处理冲突就没什么问题.

最终编译出来的`C.framework`只会包含`C`这个模块的代码, 依赖的第三库会在`A`或者`B`引入.

如果是使用static lib, 那么`C.a`就会包含第三方库的符号表, 再以此集成到其他target.

### 开发流程

大家都在一个repo, 原则上我们提交一个patch需要保证每个模块都正常编译, 因此当`C`有改动要提交, 我们需要所有模块上都能测试通过. 当`A`要开发新需求, 我们创建一个`devA`的branch, 然后`A`和`C`都有改动, 甚至一些`C`的改动还导致`B`也需要改动, 虽然这个时候并不是为了开发`B`. `B`也有`devB`在开发, 改动`C`时也有可能导致`A`被改动. 

合并需要及时, 如果`devA`开发完毕了应尽早合并回主分支, 然后再继续从主分支合并到`devB`, 此时需要解决一些冲突. 这些冲突里面就会包含在`devA`和`devB`中对`A`和`B`进行的不同的修改, 哪怕只是当时为了编译通过的修改都有可能和另一个分支冲突.

如果在同一个`dev`分支上进行`A`和`B`的开发, 只要任何时候有实验性质的feature要尝试, 就需要多个分支, 实际上现实生活中不可能只有一个dev分支的, 因此上述问题总是需要考虑的. 

导致冲突增加, 合并复杂的原因主要是3个模块相互不独立, 而且我们要贯彻提交patch保证编译通过的原则, 因此一些可以滞后的合并和修改就被提前了, 并且这种提前并不总是有效的.

如果不贯彻编译通过再提交的原则将引起更多的问题, 这个就不用多解释了.

## 多个repo管理
如果将这些模块分散到多个repo, 各自提交patch, 则需要一些手段才能将他们相互关联起来. 这里讨论使用cocoapods和git submodule. 使用cocoapods又分为两种用法, 分别是用私有spec repo来记录`C`的各个tag版本, 以及直接指定`C`的branch和commit.

### 私有spec repo + tag发版
如果`C`比较独立, 真的不涉及多少业务逻辑, 变化频率不高, 和`A` `B`的联调需求很小, 我觉得可以考虑让`C`单独开发, 并在需要的时候发版. 不用完全跟着`A`或者`B`的节奏走.

第一次创建的流程如下:
1. `C`要先写好一个`podspec`文件, 描述了自己如何被集成, 并指定了source为某一个tag号. 
2. 发布`C`到私有spec repo中.
3. 所有team member更新`C`.

之后更新`C`的时候只需给新的code打tag, 然后重复步骤2和3就好了. pod在install或者update的时候都会check缓存, 如果更新code后不更新tag将会使用cache的代码, 新代码是下不来的. 当然也可以把原来的tag删掉, 重新打一样的, 然后删掉pod的cache再update, 不过这看起来很无趣.

如果一切都像想的那么好就真的太好了. 我们肯定会遇到`C`的更新导致`A`和`B`需要修改的情况, 如何联调测试? 他们都不在一个repo了, 所以我们需要都下载下来, 但是问题是`C`要发版才能被pod更新, 因此我们就需要打很多无用的tag来不停地循环:提交代码 -> 发布`C` -> 更新`A`和`B` -> 调试. 终于调试完毕了, 删掉那一堆没用的tag. 

除非用一个其他方式来在开发`C`的电脑上集成`A`和`B`, 当然, 如果有的话, 为什么还要用tag这种方式呢?

### 直接指定branch + commit
pod支持直接指定这两者来下载code, 所以我们只要保证`C`的repo能访问就可以了, 不需要创建私有spec repo. 这种方式的branch + commit 的作用跟tag一样, 目的都是为了指向一个不可变的代码集. 集成`C`也很简单, 只要`C`的repo先准备好, 并且repo里面有`podspec`文件.

这里有个小限制, `podspec`里面指定的source一定要能访问, 否则pod检查过不了, 但是然并卵, 我们在podfile里面指定了branch和commit, pod就会从我们指定的位置下载repo, 读取`podspec`并忽略掉source配置.

`C`更新代码的时候, 如果`A`和`B`需要跟进, 则更新一下branch和commit就好, 如果忽略掉commit, 将默认是HEAD. 我们可以利用这点来简化开发流程.

我们采用这种方式是考虑到`C`的更新驱动`A`和`B`更新时, 使用tag方式带来的各种不爽. 假设基本配置都已经完成, 进入了一个稳定状态. 之后的开发流程如下:

1. `A`新建branch `devA`进行开发, 由于需要改动`C`, `C`也创建了branch `devC`. 
2. 联调的次数比较多, 在`devA`上将`podfile`中指向的`C`去掉commit, 仅保留branch信息指向`devC`, 这样默认就是使用`devC`的最新代码, 然后每次改动`C`以后就update一下, `A`就能获取到最新的代码.
3. 开发完毕后, `C`先合并回主分支, 并记录下commit, 然后`A`再合并, 并在`podfile`中修改branch为`C`的主分支以及添加commit信息.
4. 如果处于2状态的时候`B`也要开发, 可以让`C`从最开始的稳定状态再branch一个分支`devC2`, 也如2那般开发.
5. `A`合并完成后, 需要将`C`的主分支再合并到`devC2`以跟进最新改动.
6. 步骤4中也可不创建新分支, 而直接引用`devC`进行开发.

这里着重讨论一下4和6的问题. 如果`A`和`B`引用同一个`C`的dev分支, 就能够非常及时地用上新code并且不用重新开发. 如果引用不同的分支, 则`devC`上开发的新功能想要在`devC2`上用, 就需要merge或者cherry-pick一下, 如果这样做会引入新的问题则只能重新实现一下. 

如果引用不同的`C`的分支, 则整个结构和用workspace的方案很像, 分支的管理也基本一样. 区别就是workspace方案不能单独让`C`的代码回退, 换个说法就是没办法指定使用某个版本的`C`, 因为大家的patch是交叠在一起的, 回退某一个模块几乎是不可能的.

依赖的解决比较简单, `podspec`中描述好依赖就好, pod会自动解决.

### git submodule
`A`的repo用submodule引用`C`, `B`也一样. 然后用子工程或者workspace来集成`A`和`C`的工程. 这样做并没有解决上述各种方案的问题, repo仍然是分离的, 更新`C`带来的问题和使用branch+commit的方式没有区别, 而现在还需要多考虑一个依赖的问题. 

如果不用pod来集成`C`, 那么`C`的依赖怎么添加到`A`中? 手动解决就太麻烦了. 仅剩的一个方案就是用`development Pod`, 让`podfile`里面的`C`使用path指向submodule的路径, 这样仍然需要写一个`podspec`文件来描述`C`的集成. 
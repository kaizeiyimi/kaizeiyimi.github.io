---
layout: post
title:  "Coding Guidelines for Cocoa 翻译"
date:   2014-06-10 13:00:00 +0800
categories: 技术
tags: [iOS]
description: "读罢文档, 对于理解Apple的系统和API设计有了新的认识, 觉得iOS开发都应该认真读一下.翻译算是做个mark, 也加深一下自己的理解."
---

> 很多人不太注意代码编写规范，这里翻译一下Apple的这个文档，希望大家一定要注意写代码的规范，于人于己都是百利而无一害。
翻译不那么准确，如果觉得有问题可以参看Apple自家的文档。[coding Guidelines for Cocoa](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/CodingGuidelines/CodingGuidelines.html#//apple_ref/doc/uid/10000146i). 欢迎拍砖。

## 基本的命名规则

### 一、通用原则

* **清晰**  
应该尽可能的清晰并且简洁，但是不能为了简洁而影响清晰性  

| 命名  | 清晰度 |
| ---- | --- |
| insertObject: atIndex: | good |
| insert:at: | 不清晰，到底insert什么？at指的又是什么？ |
| remove: | 不清晰，要remove什么? |
| removeObjectAtIndex: | good |

一般情况下也不要使用缩写，就算它们比较长也应该拼写出来：`setBackgroundColor:` 总是好过 `setBkgdColor:`，一目了然。

> 也许你会认为一个缩写是皆知的，但是有可能阅读你代码的人和你有不同的文化背景，缩写的含义将会混淆。不过确实有一些缩写是可以使用的，后面会提到。这些缩写有很深的历史背景。
 

不要在API命名中引入歧义，断句可能不同，导致语意也会不同。

| Code | 	Commentary |
| ---- | -----------|
|sendPort |	这是发送port？还是说返回一个port？是动词还是名词？|
|displayName |	是要显示一个名字？还是获取名字？仍然不确定是动词还是名词|


* **一致性**

尽量保持跟cocoa接口一致的API命名风格。如果你的类需要从多态特性中获益，那么在不同的类使用相同的名字将会十分重要。如：

```objective-c
-(NSInteger)tag;
-(void)setStringValue:(NSString *)value;
```

* **不要自引用（No Self Reference）**

命名不要自关联，比如NSStringObject就不好。但是作为mask的常量以及notification的名字命名是个例外。


### 二、前缀
前缀对于程序接口来讲十分重要。前缀划分了功能中的模块。前缀避免了第三方开发者和苹果自身定义的符号相冲突。
>补充一句：ios中仅有一个符号表，所有单元编译后都在一个符号表中，如果没有前缀很容易冲突的

前缀有固定的格式。一般是2个或者3个大写字母并且不含下划线或子前缀。  

| Prefix |	Cocoa Framework |
| --- | ---- |
| NS |	Foundation |
| NS |	Application Kit |
| AB |	Address Book |
| IB |	Interface Builder  |

前缀使用于类，协议，函数（function），常量以及typedef的struct。 类里面的方法（method）不要使用前缀（类方法或者实例方法），因为定义这些方法的类已经表达了他们的命名空间了。另外，struct里面的字段也不要添加前缀。

### 三、书写习惯
* 对于多个单词组成的命名应该将每个单词的首字母大写并且不需要通过标点符号来连接，直接拼一起就行了，使用驼峰规则即可。但是对于方法第一个单词不大写，小写即可。记住不要加前缀。`fileExistsAtPath:isDirectory: `。 一个例外就是如果方法是以皆知的缩写开始，比如`TIFFRepresentation(NSImage *)`，那就保持。对于函数和常量保持其相关联的前缀并将第一个嵌入的单词首字母大写。比如：`NSRunAlertPanel，NSCellDisabled`。

* 一定避免使用下划线作为私有方法的前缀，但是作为实例变量的前缀是允许的。Apple保留使用下划线作为私有方法前缀的权利。第三方使用的话可能引起命名冲突。你可能无意间就覆盖了已有的私有方法并带来灾难性的后果。后面会讲私有方法的命名建议。

### 四、类和协议的命名
* 类名应该包含一个名词用以说明这个类或者这个类的实例代表什么，名字应该包含一个合适的缩写。系统的框架就是很好的例子。

例如`NSString, NSDate, NSScanner, NSApplication, UIApplication, UIButton`等。

* 协议的命名应该根据协议组合的方法来确定。
许多的协议所规定的方法跟具体类无关，这种协议就不要命名得像一个类，不然容易混淆。通常的做法是使用动名词，如NSLocking而不是NSLock，因为NSLock更像是一个类。

* 有时候一些协议可能包含了一些不相关的方法（因为不想创建很多小的协议），这种协议一般都是和某些特定类相关的，这种情况下通常将协议和类的名字弄得一样。比如`NSObject`。

### 五、头文件
头文件的命名通常需要表明它所包含的内容。

1. 如果类或者协议不是某一组功能的一部分则单独创建头文件。
2. 如果是有关联性的类或者协议则最好放到主类（分类，协议）中。比如NSString和NSMutableString。
3. 如果是框架的话，那应该有一个头文件包含所有的框架中的头文件。
4. 给另外的框架中的类添加分类文件时，应添加Additions，如ApplicationKit中的NSBundleAdditions.h（不会有问题么？可能多个框架都扩展NSBundle？）
5. 相关联的函数以及数据类型，常量等应该放到一个合适命名的头文件里面，如NSGraphics.h
 

## 给方法命名
### 一、基本规则
* 小写开头并且驼峰后面的单词，不要使用前缀。两个例外：一个是使用如TIFF或者PDF这种皆知的前缀开头，另一种就是命名私有方法时的一种特殊处理，如XX_XXX这种。参考后面的私有方法命名。
* 如果方法代表的是一个对象所采取的动作，那么以动词开头。

```objective-c
     - (void)invokeWithTarget:(id)target;      
     - (void)selectTabViewItem:(NSTabViewItem *)tabViewItem;
```

* 不要使用do或者does，因为这两词的存在价值几乎为0。一个例外：`- (void)doesNotRecognizeSelector:(SEL)aSelector`。
另外动词前面不要使用副词或者形容词。。。

* 如果方法返回的是某个属性，则直接用这个属性名做名字。单个属性不要使用get，毫无意义。如果不使用get会引起混淆才应该添加get。参考”属性访问方法“。

* 在所有参数前面添加关键字，用作解释参数。

* 如果已有一个方法，现在需要添加另外一个相比现在有更多参数的方法，那就保持前面的声明不变，而在后面添加新的参数。

```objective-c
     - (id)initWithFrame:(CGRect)frameRect;
     - (id)initWithFrame:(CGRect)frameRect mode:(int)aMode;
```

* 不要使用and来连接各个参数，除非参数是完全不同的两个操作。

```objective-c
     - (BOOL)openFile:(NSString *)fullPath withApplication:(NSString *)appName andDeactivate:(BOOL)flag;
```

### 二、accessor方法
这类方法就是值设置以及获取对象属性的方法，书写方法有自己的规则。

* 如果属性是名词，则应该是

```objective-c
     - (type)noun;
     - (void)setNoun:(type)aNoun;
```

* 如果是形容词则应该是

```objective-c
     - (BOOL)isEditable;
     - (void)setEditable:(BOOL)flag;
```

* 如果是动词，应使用现在时态：

```objective-c
     - (BOOL)showsAlpha;                                          
     - (void)setShowsAlpha:(BOOL)flag;
```

* 不要把动词转换为过去分词。
可以使用情态动词 can，should，will等以强调意义，但是不要使用do或者does。

* get仅使用在可能返回多个值的情况中，

```objective-c
     - (void)getLineDash:(float *)pattern count:(int *)count phase:(float *)phase;
```
这种方法应该能够接受参数为NULL的out参数，如count， phase。 

### 三、代理方法 
* 以发送消息的类开头，去掉前缀，并且小写开头. 

```objective-c
     - (BOOL)tableView:(NSTableView *)tableView shouldSelectRow:(int)row;
```

* 冒号应直接写在类后面，如果上面的tableView，除非整个代理方法仅有一个参数。

```objective-c
      -(BOOL)applicationOpenUntitledFile:(NSApplication *)sender;  
```
一个例外就是接收通知的方法，此时参数是通知而不是发送通知的类。 

```objective-c
      -(void)windowDidChangeScreen:(NSNotification *)notification;  
```

* 使用will和did告诉代理某个事情将要发生或者已经发生。如果是问代理是否要做某事情则应该用should。  

### 四、集合方法 
对于管理多个对象的集合对象（每个集合中的对象chengweii一个元素），习惯上的命名方式如下：

```objective-c
     - (void)addLayoutManager:(NSLayoutManager *)obj;
     - (void)removeLayoutManager:(NSLayoutManager *)obj;
     - (NSArray *)layoutManagers;
```
有几点需要特别注意的：如果集合无序，返回集合时应使用NSSet而不是NSArray。如果有序应该提供插入到指定位置和从指定位置删除的元素的方法。 集合方法应当持有插入的对象，当删除时应该释放该对象。 如果被插入的元素需要知道主集合对象的指针，那么设置的时候不要retain。

### 五、 方法参数
* 参数名以小写开始，仍然是下一个单词首字母大写。 removeObject:(id)anObject;
* 不要在参数名中使用pointer或者ptr等，应该让参数的类型来说明其是一个指针而不是让参数名来说明。
* 尽量不要使用一两个字母作为参数。
* 尽量少用缩写。

### 六、私有方法
大部分情况下，私有方法的命名规则与公共方法的命名规则相同。但是已有一个习惯就是给私有方法添加一个前缀好和公共方法相区分，尽管有这么一个习惯，但是这么给私有方法命名有时会引发奇怪的问题。特别是当你设计一个cocoa框架类的子类时，你没法知道你的方法是不是不小心覆盖了框架类的私有方法。
cocoa框架中的大部分方法都以下划线开头来表示他们是私有方法，因此一定要注意以下两点：

1. 不要以下划线开头来命名你的私有方法，Apple保留这么做的习惯（Apple reserves this convention）。
2. 如果你在继承一个大类，例如UIView，并且你想确保你的私有方法不会和父类的重名，你可以添加你专属的前缀，例如XX_，RR_addObject:
> 这里不是要故意和之前所述的规则相违背，这么做是为了避免不小心覆盖父类的方法。


## 函数命名
函数命名大部分情况下和方法命名相同。但是以下是一些区别：

1. 函数名应该与使用的类或者常量有相同的前缀，CGRectMake，
2. 前缀后面的第一个单词首字母大写。
3. 大部分函数以动词开头描述了它的动作。
4. 如果函数返回其第一个参数的某个属性则去掉动词。 NSHeight(NSRect aRect)
5. 如果返回值是指针，则以get开头。


## 属性命名和数据类型命名
本节描述声明属性，实例变量，常量，通知，异常的命名。

### 一、 property的命名
property的命名和setter，getter的命名很相似，如果property是名词或者动词：

```objective-c
@property(strong) NSString *title;
@property(assign) BOOL showsAlpha;
```

如果property是形容词，则去掉前缀is.`@property(assign, getter=isEditable) BOOL editable;`

名字应该准确地表达属性所存储的内容，除了在init和dealloc中可以直接访问实例变量，其他地方都应该使用setter和getter。自动生成的实例变量都是以下划线开头。

添加实例变量时要注意：

* 不要声明public 的实例变量。
* 开发者应该将property作为对象的接口来对待而不是关心具体存储的数据。应该通过声明property 和synthesise 来表达对应的实例变量。
* 如果你确实需要声明实例变量，使用@private或者@protected。
* 如果你期望你的类被继承并且这些子类需要直接访问父类的实例变量，那么使用@protected。
* 如果一个实例变量需要被外部访问则应该给他写setter和getter方法，最好是声明为property。

### 二、 常量
* 枚举的常量

如果是整型枚举则使用enum。枚举变量的定义应该和函数名定义规则相同。

```objective-c
typedef enum _NSMatrixMode {
    NSRadioModeMatrix     = 0,
    NSHighlightModeMatrix = 1,
    NSListModeMatrix      = 2,
    NSTrackModeMatrix= 3
} NSMatrixMode;
```
`_NSMatrixMode` 可以不写。

你也可以创建没有名字的enum。那样就直接使用名字，类型就是NSInteger。


* const声明的常量
浮点数常量应使用const声明，如果整形常量相互之间无关则单独用const声明，否则应该声明为enum。

* 其他类型常量
总之，**不要使用#define去定义常量**。
使用大写的预编译宏去判断代码块是否需要处理。 #ifdef DEBUG
编译器的预编译宏前后都是双下划线。
通知和字典的key也需要用const定义字符串。比如APPKIT_EXTERN NSString *NSPrintCopies;


### 三、通知和异常

* 通知
 
如果一个类有代理，那么它大多数的通知都是通过代理方法进行接受的，通知的名字应该能正确对应相关代理方法。例如：`applicationDidBecomeActive:`这个代理方法同时也有一个`UIApplicationDidBecomeActiveNotification`通知。
通知的格式为[关联类的类名]+[did|will]+[特定的动作等名字]+Notification，如上例。

* 异常

尽管你可以随意使用NSException和相关的方法，但是Apple保留使用exception来处理程序错误比如数组越界，但是不会拿来处理常规的可能出错的场景.

比如使用nil，NULL，NO或者error codes作为返回值。(use returned values such as nil, NULL, NO, or error codes).

exception的命名规则如下：
[prefix]+[唯一的名字]+Exception;


## 皆知的缩写
一般情况下开发者不应该使用缩写，但是以下的缩写是皆知的并且允许的。
C里面的那些相当有历史的缩写是可以使用的，如alloc，getc等。

| Abbreviation | 	Meaning and comments |
| ----| ---- |
|alloc |	Allocate. |
| alt |	Alternate. |
| app |	Application. For example, NSApp the global application object. However, “application” is spelled out in delegate methods, notifications, and so on.|
| calc |	Calculate. |
| dealloc | 	Deallocate. |
| func | 	Function. |
| horiz |	Horizontal. |
| info |	Information. |
| init | 	Initialize (for methods that initialize new objects). |
| int |	Integer (in the context of a C int—for an NSInteger value, use integer). |
| max | 	Maximum. |
| min | 	Minimum. |
| msg | 	Message. |
| nib | 	        Interface Builder archive. |
| pboard | 	        Pasteboard (but only in constants). |
| rect | 	        Rectangle. |
|Rep | 	        Representation (used in class name such as NSBitmapImageRep). |
| temp | 	Temporary. |
|vert |	Vertical. |
还有一些计算机行业的专业术语也可以缩写，ASCII,PDF,XML,HTML,URL,RTF,HTTP，TIFF,JPG,PNG,GIF,LZW,ROM,RGB,CMYK,MIDI,FTP.


## 针对框架开发者的建议
这类人应该更加小心地书写code。框架会被很多客户端引入，如果稍有疏忽将有可能引起系统范围的错误。以下的建议将帮助这类人保持框架的效率和完整性。这些技术不仅仅适用于框架开发，app开发也可以参考。

### 类初始化
initialize的类方法给予了类一个生命周期，可以有一次延迟到这个类的任意方法被调用前才执行代码的机会。通常可用来设置类的version等。
runtime会在继承树上调用initialize，因此如果子类没有实现该方法，那么父类的这个方法可能会被调起两次。而一般开发者可能仅仅想执行一次。可以使用dispatch_once。当然，如果你想确认当前上下文是父类的情况下才执行，那可以添加判断，当self是父类时才执行。

```objective-c
if (self == [NSFoo class]) { 
	//do something 
}
```
不要直接调用该方法，如果确实想触发initialize那就调用[NSFoo self].

### 指定的实例初始化方法
* 一般init即是。需要在方法中调用super。每一个公共的类都应该有至少1个指定的初始化方法。例如`initWithFrame:` 。有一些类的init方法是不期望被重写的，比如NSString 和其他抽象类集合的顶层类，因为这些集合类的子类自己有自己的实现。
* 应该清晰地标注出指定初始化方法，如果你期望你的类被继承的话。子类能够仅重载指定初始化方法就能正常工作。

### 初始化中的错误检测
良好的初始化方法应该按照如下步骤：

1. 调用super的初始化方法来重新给self赋值。
2. 检测self是否为nil，如果是的话说明父类的初始化出错了。
3. 如果初始化出错则返回nil。

### 版本和兼容性
当添加新的类或者方法到框架时一般不需要为每个新功能指定版本。开发者一般应该通过runtime去检测是否相应某个方法来判断一个特性是否可用，这种检测方法一般比检测版本更动态更有效。 

有时一个新功能或者bug fix不是那么容易被runtime检查，则应该提供framework的vsersion供开发者查看。
要标明变化的版本。并设置它全局可访问。可以放在框架的info.plist里面。

### keyed Archiving
如果框架需要用到该技术，则一定要考虑到一下的情况：
如果key没有，则返回的是nil，NULL，NO，0或者0.0等。应该检测一下这些值以减少要写的数据。
encode和decode都是可以向后兼容的。missing key不会有崩溃。
key应该和框架中其他方法有相同的前缀，然后是变量名。总之不要跟父类或者子类的冲突。
bitfields最好不要碰。

### 异常和错误
抛出异常不是正常执行的流程，而写也不是用来沟通tuntime或者用户错误的。比如文件没找到，没有此用户，文件类型有误，字符串转换编码失败等。这类错误是error，不抛出异常。

抛出异常一般是程序逻辑错误。比如数组越界，尝试修改不可修改的对象，错误的参数类型等。异常应该是给开发者在开发测试中使用来定位问题的，程序正常逻辑中不需要去处理异常。如果抛出了异常但是没有catch，那么顶层的处理将捕获异常并报告，然后执行继续。开发者可以替换默认的行为，以提供更多的信息，也可以写到文件再退出程序。

cocoa框架中的error是和其他库不太一样。一般没有error codes。开发者应该检测返回的error为NO或者nil，如果确实有错误产生不要试图根据errorcode去判断要做什么，应该抛出异常或者在日志中记录错误信息。

如果确实需要知道错误情况，那么用指针in-out，方法的返回值则应该为nil或者NO。同时方法需要检测传递进来的error参数是否为NULL。

### 常量数据
为了性能，应该尽量把框架里面的数据做成常量，因为非常量的全局变量和静态变量是放在读写数据段中的。静态变量在每个实例中都会存在，这样有可能会增加内存页的使用。
应该将常量就标记为常量，正常情况下常量会存在于代码段，If there are no char * pointers in the block，数据将存储到只读数据段。
因该初始化静态变了，以保证数据被放到读写数据段中而不是未初始化数据段。如果没有合适的值则给0，NULL，0.0之类的
不要一下分配所有的内存，如果需要一些临时的缓冲区，一般使用栈而不是分配一个缓冲（it’s usually better to use the stack than to allocate a buffer）。栈有大小限制，512KB，所以根据方法和缓冲的用途来决定是否需要用栈。如果需求比较小，1K以内，用栈是ok的。

### 对象比较
注意区分isEqual：和表明了对象的如isEqualToString：。前者可以传入模糊的对象，不过判定不相同则返回NO，但是后者是指定了参数类型的。因此在内部不再执行类型检查，快但是不那么安全。如果是从外部文件读入的最好使用前者，因为那样更安全，除非已知类型。

另外要注意，isEqual：和hash是关联的，基于hash机制的cocoa对象比如NSDictionary等如果[A isEqual:B] == YES，则[A hash] == [B hash]也一定成立。因此，如果你重载isEqual：那你也应该重载hash。默认情况下，isEqual仅检查两个对象的地址是否相同，而hash是基于地址计算的，因此本质上两者相同。
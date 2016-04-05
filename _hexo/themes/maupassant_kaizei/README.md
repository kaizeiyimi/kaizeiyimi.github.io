
主题移植自 [tufu9441/maupassant-hexo](https://github.com/tufu9441/maupassant-hexo), 去掉了一些我用不上的功能. 详情参见origin.

## Installation

* 需要scss解释器. 之后会简化`style.scss`的内容.
* 需要marked. 没有用`hexo-renderer-marked`, 因为如果用, 扩展性几乎为0. 现在是在`scripts`下解析markdown以及进行高亮.

## configuration

去掉了一大堆, 仅保留了`google_search`, `shareto`和`busuanzi`.

widget去掉了评论和推荐链接.

高亮使用了hexo带下来的`hightlight.js`, 十分依赖其路径(相对base_dir), 不过看起来是可以依赖的.

目录的代码也暂时注释掉了, 不喜欢现在的目录布局, 之后修改.

更多请参阅原版.

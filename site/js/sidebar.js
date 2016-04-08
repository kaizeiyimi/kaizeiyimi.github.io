(function($){

  var sidebarContainer = $('#sidebar-container'),
    parent = sidebarContainer.parent();
  var lastOffset;

  $(window).scroll(layout);
  $(window).resize(layout);
  layout();

  function layout() {
    var currentOffset = $(window).scrollTop();
    if (!lastOffset) {
      lastOffset = currentOffset;
    }
    var diff = currentOffset - lastOffset;
    lastOffset = currentOffset;

    var sidebarContainerHeight = sidebarContainer.outerHeight(),
      parentTop = parent.offset().top, 
      parentHeight = parent.height();

    // set placeholder
    $('#sidebar-placeholder').css({
      height: sidebarContainerHeight
    });

    sidebarContainer.css({
      left: parent.offset().left,
      width: parent.width()
    });

    // layout
    if (currentOffset <= parentTop
      || sidebarContainerHeight >= parentHeight) {
      sidebarContainer.css({top: parentTop - currentOffset});
      return;
    }

    var bottomDistance = $(document).height() - (parentTop + parentHeight),
      targetTop = (parseInt(sidebarContainer.css('top')) || 0) - diff,
      targetBottom = targetTop + sidebarContainerHeight;

    targetTop = Math.max(targetBottom, $(window).height() - bottomDistance) - sidebarContainerHeight;
    targetTop = Math.min(targetTop, 0);
    sidebarContainer.css({top: targetTop});
  };

})(jQuery);

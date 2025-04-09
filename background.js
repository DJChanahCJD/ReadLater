// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "addToReadLater",
      title: "添加到稍后阅读",
      contexts: ["link", "page"],
    })
  })
  
  // 处理右键菜单点击事件
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "addToReadLater") {
      const url = info.linkUrl || info.pageUrl
      const title = info.linkUrl ? info.selectionText || url : tab.title
  
      // 从存储中获取现有链接
      chrome.storage.local.get(["readLaterLinks"], (result) => {
        const links = result.readLaterLinks || []
  
        // 检查链接是否已存在
        if (!links.some((link) => link.url === url)) {
          // 添加新链接到列表开头
          links.unshift({
            url: url,
            title: title,
            addedAt: new Date().toISOString(),
            read: false,
          })
  
          // 保存更新后的链接列表
          chrome.storage.local.set({ readLaterLinks: links }, () => {
            // 显示通知
            chrome.notifications.create({
              type: "basic",
              iconUrl: "icon.png",
              title: "稍后阅读",
              message: "已添加到稍后阅读列表",
            })
          })
        } else {
          // 链接已存在，显示通知
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "稍后阅读",
            message: "该链接已在稍后阅读列表中",
          })
        }
      })
    }
  })
  
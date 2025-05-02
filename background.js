const addToReadLater_MenuId = "addToReadLater"
const addToText = "添加到稍后阅读"
const removeFromText = "从稍后阅读中移除"

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: addToReadLater_MenuId,
    title: addToText,
    contexts: ["link", "page"],
  })
})
  
// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {

  if (info.menuItemId === addToReadLater_MenuId) {
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
        })

        // 保存更新后的链接列表
        chrome.storage.local.set({ readLaterLinks: links })
        updateContextMenuTitle(addToReadLater_MenuId, removeFromText)
      } else {
        // 从列表中移除链接
        const updatedLinks = links.filter((link) => link.url !== url)

        // 保存更新后的链接列表
        chrome.storage.local.set({ readLaterLinks: updatedLinks })
        updateContextMenuTitle(addToReadLater_MenuId, addToText)
      }
    })
  }
})

// 添加消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request)
  if (request.type === "updateContextMenu") {
    if (request.action === "add") {
      updateContextMenuTitle(addToReadLater_MenuId, removeFromText)
    } else if (request.action === "remove") {
      updateContextMenuTitle(addToReadLater_MenuId, addToText)
    }
  }
})


chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return
        
        console.log("Switched to tab:", tab.url)
        chrome.storage.local.get(["readLaterLinks"], (result) => {
            const links = result.readLaterLinks || []
            const exists = links.some(link => link.url === tab.url)
            updateContextMenuTitle(addToReadLater_MenuId, 
                exists ? removeFromText : addToText)
        })
    })
})


// 更新右键菜单
function updateContextMenuTitle(id, title) {
  chrome.contextMenus.update(id, { title: title })
  console.log("Updated context menu title:\n" + title)
}
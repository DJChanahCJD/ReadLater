document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput")
    const cardList = document.getElementById("cardList")
    let links = []
  
    // 从存储中加载链接
    function loadLinks() {
      chrome.storage.local.get(["readLaterLinks"], (result) => {
        links = result.readLaterLinks || []
        renderLinks(links)
      })
    }

    // 自动聚焦搜索框
    searchInput.focus()
  
    // 渲染链接列表
    function renderLinks(linksToRender) {
      if (linksToRender.length === 0) {
        cardList.innerHTML = `
          <div class="empty-state">
            <i class="ri-inbox-line"></i>
            <span>暂无保存的链接</span>
          </div>
        `
        return
      }

    // 使用文档片段优化性能
    const fragment = document.createDocumentFragment()
      
    linksToRender.forEach((link, index) => {
        const card = document.createElement("div")
        card.className = "card"
        card.draggable = true
        card.dataset.index = index

        // 提取域名
        let urlObj
        try {
            urlObj = new URL(link.url)
        } catch (e) {
            urlObj = { hostname: link.url }
        }
        const hostname = urlObj.hostname.replace("www.", "")

        // 格式化添加时间
        const addedDate = link.addedAt ? new Date(link.addedAt) : new Date()
        const formattedDate = formatDate(addedDate)

        card.innerHTML = `
            <div class="card-content">
            <div class="card-title" title="${link.title}">${link.title}</div>
            <div class="card-meta">
                <div class="card-url" title="${link.url}">
                <i class="ri-link"></i>
                ${hostname}
                </div>
                <div class="card-date">
                <i class="ri-time-line"></i>
                ${formattedDate}
                </div>
            </div>
            </div>
            <div class="card-actions">
            <button class="delete-btn" title="删除">
                <i class="ri-delete-bin-line"></i>
            </button>
            </div>
        `

        // 点击卡片内容区域跳转
        const cardContent = card.querySelector(".card-content")
        cardContent.addEventListener("click", () => {
            window.open(link.url, "_blank")
            // 标记为已读
            markAsRead(index)
        })

        // 删除按钮点击事件
        const deleteBtn = card.querySelector(".delete-btn")
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation() // 阻止事件冒泡
            e.preventDefault() // 阻止默认行为

        // 从数组中移除
        const currentLinks = links.filter((_, i) => i !== index)
        links = currentLinks

        // 保存到存储
        chrome.storage.local.set({ readLaterLinks: links }, () => {
            // 重新渲染列表
            renderLinks(links)
        })
        })

        // 拖拽事件处理
        card.addEventListener("dragstart", handleDragStart)
        card.addEventListener("dragover", handleDragOver)
        card.addEventListener("drop", handleDrop)
        card.addEventListener("dragend", handleDragEnd)

        fragment.appendChild(card)
    })
      
      cardList.innerHTML = ""
      cardList.appendChild(fragment)
    }

    // 优化搜索防抖
    searchInput.addEventListener("input", (e) => {
      setTimeout(() => {
        const searchTerm = e.target.value.toLowerCase()
        const filteredLinks = links.filter(
          (link) => link.title.toLowerCase().includes(searchTerm) || link.url.toLowerCase().includes(searchTerm)
        )
        renderLinks(filteredLinks)
      }, 200)
    })
  
    // 格式化日期
    function formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const MS_PER_DAY = 86400000;
        
        // 缓存日期组件
        const dateYear = date.getFullYear();
        const dateMonth = date.getMonth();
        const dateDay = date.getDate();
        const nowYear = now.getFullYear();
        
        // 如果是今天，显示时间
        if (diff < MS_PER_DAY && dateDay === now.getDate()) {
            return `今天 ${date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
            })}`;
        }
        
        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (dateDay === yesterday.getDate() && 
            dateMonth === yesterday.getMonth() && 
            dateYear === yesterday.getFullYear()) {
            return "昨天";
        }
        
        // 日期格式化选项
        const options = {
            month: '2-digit',
            day: '2-digit'
        };
        
        // 如果不是今年，添加年份
        if (dateYear !== nowYear) {
            options.year = 'numeric';
        }
        
        // 使用 Intl.DateTimeFormat 进行本地化格式化
        return new Intl.DateTimeFormat('zh-CN', options)
            .format(date)
            .replace(/\//g, '/');
    }

  
    // 搜索功能
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase()
      const filteredLinks = links.filter(
        (link) => link.title.toLowerCase().includes(searchTerm) || link.url.toLowerCase().includes(searchTerm),
      )
      renderLinks(filteredLinks)
    })
  
    // 拖拽相关变量
    let draggedItem = null
    let draggedIndex = null
  
    function handleDragStart(e) {
      draggedItem = this
      draggedIndex = Number.parseInt(this.dataset.index)
      this.classList.add("dragging")
  
      // 设置拖拽效果
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/html", this.innerHTML)
    }
  
    function handleDragOver(e) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
  
      // 添加视觉提示
      this.classList.add("drag-over")
    }
  
    function handleDrop(e) {
      e.preventDefault()
      this.classList.remove("drag-over")
  
      const dropIndex = Number.parseInt(this.dataset.index)
      if (draggedIndex === dropIndex) return
  
      // 更新数组顺序
      const [movedItem] = links.splice(draggedIndex, 1)
      links.splice(dropIndex, 0, movedItem)
  
      // 保存新顺序到存储
      chrome.storage.local.set({ readLaterLinks: links }, () => {
        renderLinks(links)
      })
    }
  
    function handleDragEnd() {
      this.classList.remove("dragging")
  
      // 清除所有拖拽状态
      document.querySelectorAll(".card").forEach((card) => {
        card.classList.remove("drag-over")
      })
  
      draggedItem = null
      draggedIndex = null
    }
  
    // 初始加载
    loadLinks()
  })
  
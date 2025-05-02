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
				urlObj = {
					hostname: link.url
				}
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
            <button class="edit-btn" title="编辑">
                <i class="ri-edit-line"></i>
            </button>
            <button class="delete-btn" title="删除">
                <i class="ri-delete-bin-line"></i>
            </button>
            </div>
        `

			// 添加编辑按钮点击事件
			const editBtn = card.querySelector(".edit-btn")
			editBtn.addEventListener("click", (e) => {
				e.stopPropagation() // 阻止事件冒泡
				e.preventDefault() // 阻止默认行为

				const titleElement = card.querySelector(".card-title")
				const currentTitle = titleElement.textContent

				// 创建输入框
				const input = document.createElement("input")
				input.type = "text"
				input.value = currentTitle
				input.className = "edit-title-input"

				// 阻止输入框的点击事件冒泡
				input.addEventListener('click', (e) => {
					e.stopPropagation();
				})

				// 替换标题为输入框
				titleElement.innerHTML = ""
				titleElement.appendChild(input)
				input.focus()

				// 处理输入框失焦和回车事件
				const handleTitleUpdate = () => {
					const newTitle = input.value.trim()
					if (newTitle) {
						links[index].title = newTitle
						// 保存到存储
						chrome.storage.local.set({
							readLaterLinks: links
						}, () => {
							renderLinks(links)
						})
					} else {
						titleElement.textContent = currentTitle
					}
				}

				input.addEventListener("blur", handleTitleUpdate)
				input.addEventListener("keyup", (e) => {
					if (e.key === "Enter") {
						handleTitleUpdate()
					} else if (e.key === "Escape") {
						titleElement.textContent = currentTitle
					}
				})
			})

			// 点击卡片内容区域跳转
			const cardContent = card.querySelector(".card-content")
			cardContent.addEventListener("click", (e) => {
				// 如果点击的是输入框，不执行跳转
				if (e.target.classList.contains('edit-title-input')) {
					return;
				}
				window.open(link.url, "_blank")
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
				chrome.storage.local.set({readLaterLinks: links}, () => {
					// 重新渲染列表
					renderLinks(links)
					chrome.tabs.query({active: true,currentWindow: true}, (tabs) => {
						const currentTab = tabs[0]
						if (currentTab.url === link.url) {
							// 发送消息给content.js
							chrome.runtime.sendMessage({
								type: "updateContextMenu",
								url: link.url,
								action: "remove"
							})
						}
					})
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
		chrome.storage.local.set({
			readLaterLinks: links
		}, () => {
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

	// 添加当前页面按钮点击事件
	const addCurrentBtn = document.getElementById("addCurrentBtn")
	addCurrentBtn.addEventListener("click", () => {
		chrome.tabs.query({
			active: true,
			currentWindow: true
		}, (tabs) => {
			const currentTab = tabs[0]
			const url = currentTab.url
			const title = currentTab.title

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
					chrome.storage.local.set({
						readLaterLinks: links
					}, () => {
						renderLinks(links)
						chrome.runtime.sendMessage({
							type: "updateContextMenu",
							url: url,
							action: "add"
						})
					})
				}
			})
		})
	})

	// 初始加载
	loadLinks()
})
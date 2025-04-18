const draggable = vuedraggable;
const app = Vue.createApp({
    components: { draggable },
    data() {
        return {
            proposals: [],
            columnOrder: [
                "總表項次", "提案日期", "提案人", "站點", "部門", "部門owner", 
                "提案內容", "預算金額", "審核狀態", "備註", "回覆備註"
            ],
            loading: true,
            dropdownOpen: null, // 目前開啟的篩選標題
            selectedFilters: {}, // 存儲篩選條件
            pendingFilters: {},  // ✅ 這是暫存篩選條件，只有按下「套用」才會更新
            searchQuery: {}, // 搜索框的輸入值
            dropdownPosition: { top: 0, left: 0 }, // 記錄篩選卡片的位置
            sortOrder: null, // 排序狀態 ('asc', 'desc', null)
            editingRow: null, // 存放當前正在編輯的行
                    // ✅ 加這兩個
            treeData: [],
            defaultTreeProps: {
                children: 'children',
                label: 'label'
            },
            // 拖曳節點
            nodes: Array.from({ length: 3 }, (_, i) => ({
                id: i + 1,
                text: `節點 ${i + 1} 的說明`,
                status: '未完成',
                fields: []
            })),
            nextId: 4,
            selectedNodeId: null,
            selectedFieldIndex: null // 👉 現在選中的欄位索引
        };
    },
    computed: {
        // 取得篩選後仍然可選的唯一選項
        filteredUniqueOptions() {
            const options = {};
            const filteredData = this.filteredProposals;
            
            if (filteredData.length > 0) {
                Object.keys(filteredData[0]).forEach((key) => {
                    options[key] = [...new Set(filteredData.map(p => p[key]))];
                });
            }
            return options;
        },
        // 根據搜索條件篩選選單內容
        filteredDropdownOptions() {
            if (!this.dropdownOpen || !this.searchQuery[this.dropdownOpen]) {
                return this.filteredUniqueOptions[this.dropdownOpen] || [];
            }
            return this.filteredUniqueOptions[this.dropdownOpen].filter(option =>
                option.includes(this.searchQuery[this.dropdownOpen])
            );
        },
        // 是否 "ALL" 被選擇
        isAllSelected() {
            if (!this.dropdownOpen || !this.filteredDropdownOptions.length) return false;
            return this.pendingFilters[this.dropdownOpen]?.length === this.filteredDropdownOptions.length;
        },
        // 根據篩選條件過濾數據
        filteredProposals() {
            return this.proposals.filter(proposal => {
                return Object.keys(this.selectedFilters).every(key => {
                    // 如果 `selectedFilters[key]` 為空，則不進行篩選
                    if (!this.selectedFilters[key] || this.selectedFilters[key].length === 0) return true;

                    // **允許多選篩選條件**
                    return this.selectedFilters[key].includes(proposal[key]);
                });
            });
        },
        // 排序 `提案日期`
        sortedProposals() {
            if (!this.sortOrder) return this.filteredProposals;
            return [...this.filteredProposals].sort((a, b) => {
                return this.sortOrder === "asc"
                    ? Number(a["提案日期"]) - Number(b["提案日期"])
                    : Number(b["提案日期"]) - Number(a["提案日期"]);
            });
        },
        selectedNode() {
            return this.nodes.find(n => n.id === this.selectedNodeId) || null;
        },

        selectedField() {
            if (
              this.selectedNode &&
              Array.isArray(this.selectedNode.fields) &&
              this.selectedFieldIndex != null &&
              this.selectedNode.fields[this.selectedFieldIndex] !== undefined
            ) {
              return this.selectedNode.fields[this.selectedFieldIndex];
            }
            return null;
        },
    },

    methods: {
        async fetchData() {
            try {
                const response = await axios.get("http://localhost:5000/api/proposals");
                this.proposals = response.data;
                console.log(this.proposals)
            } catch (error) {
                console.error("無法獲取數據:", error);
            } finally {
                this.loading = false;
            }
        },
        toggleFilterOption(option) {
            if (!this.pendingFilters[this.dropdownOpen]) {
                this.pendingFilters[this.dropdownOpen] = [];
            }

            const index = this.pendingFilters[this.dropdownOpen].indexOf(option);

            if (index > -1) {
                this.pendingFilters[this.dropdownOpen].splice(index, 1);
            } else {
                this.pendingFilters[this.dropdownOpen].push(option);
            }
        },

        toggleDropdown(key, event) {
            if (key === "預算金額" || key === "回覆備註") return; 

            if (this.dropdownOpen === key) {
                this.dropdownOpen = null;
                return;
            }

            this.dropdownOpen = key;
            this.searchQuery[key] = ""; 

            // ✅ 確保 `pendingFilters` 是 `selectedFilters` 的複製品
            this.pendingFilters[key] = [...(this.selectedFilters[key] || [])];

            this.$nextTick(() => {
                const rect = event.target.getBoundingClientRect();
                this.dropdownPosition = {
                    top: rect.bottom + window.scrollY + 10,
                    left: rect.left + window.scrollX
                };
            });

            document.addEventListener("click", this.closeDropdownOnClickOutside);
            event.stopPropagation();
        },

        applyFilters() {
            if (this.dropdownOpen) {
                this.selectedFilters[this.dropdownOpen] = [...(this.pendingFilters[this.dropdownOpen] || [])];
                this.dropdownOpen = null; // ✅ 關閉篩選選單
            }
        },

        resetFilter(key) {
            if (key) {
                // ✅ 只清除當前篩選選單的條件
                this.pendingFilters[key] = [];
                this.selectedFilters[key] = [];
            } else {
                // ✅ 如果沒有指定 key，清除所有篩選條件
                this.pendingFilters = {};
                this.selectedFilters = {};
            }
        },

        closeDropdownOnClickOutside(event) {
            if (!event.target.closest(".fixed")) {
                this.dropdownOpen = null;
                document.removeEventListener("click", this.closeDropdownOnClickOutside);
            }
        },
        sortColumn() {
            this.sortOrder = this.sortOrder === "asc" ? "desc" : this.sortOrder === "desc" ? null : "asc";
        },
        toggleAllSelection() {
            if (this.isAllSelected) {
                this.pendingFilters[this.dropdownOpen] = [];
            } else {
                this.pendingFilters[this.dropdownOpen] = [...this.filteredDropdownOptions];
            }
        },
        getLastRemark(remarks) {
            if (!Array.isArray(remarks) || remarks.length === 0) return "無回覆";
            let text = remarks[remarks.length - 1]
                .replace(/\r/g, " ")  
                .replace(/\n/g, " ")  
                .replace(/<br>/g, " ") 
            // **每 20 個字插入換行**
            return text;
        },
        resetAllFilters() {
            this.pendingFilters = {};  // 清除暫存篩選條件
            this.selectedFilters = {}; // 清除已套用的篩選條件
            this.dropdownOpen = null;  // 確保篩選選單關閉
            this.sortOrder = null; // 取消排序
        },
        async openEditModal(proposal) {
            this.editingRow = { ...proposal };
            try {
                const response = await axios.get("http://localhost:5000/api/tree");
                this.treeData = response.data;
            } catch (err) {
                console.error("載入樹失敗", err);
                this.treeData = []; // 保底清空
            }
        },

        async saveChanges() {
            try {
                await axios.put(`http://localhost:5000/api/proposals/${this.editingRow["總表項次"]}`, this.editingRow);
                alert("修改成功！");
                this.editingRow = null;
                this.fetchData(); // 重新獲取資料
            } catch (error) {
                console.error("更新失敗:", error);
                alert("修改失敗，請重試");
            }
        },
        closeEditModal() {
            this.editingRow = null; // 取消編輯
        },
        addNode() {
            this.nodes.push({
                id: this.nextId,
                text: `節點 ${this.nextId} 的說明`,
                status: '未完成',
                fields: []
            });
            this.nextId++;
        },
        removeNode() {
            if (this.nodes.length > 0) {
                const removed = this.nodes.pop();
                if (removed.id === this.selectedNodeId) {
                this.selectedNodeId = null;
                }
                this.nextId--;
            }
        },
        markAsCompleted() {
            const node = this.nodes.find(n => n.id === this.selectedNodeId);
            if (node) {
                node.status = node.status === '完成' ? '未完成' : '完成';
            }
        },

        addField() {
            if (this.selectedNode) {
                this.selectedNode.fields.push({
                    id: Date.now(),
                    item: '',
                    children: [
                        {
                            id: Date.now() + 1,
                            label: '測試節點',
                            checked: false,
                            children: []
                        }
                    ],
                    checked: false,      // ✅ 若 el-tree 用到 check-box
                });
                this.selectedFieldIndex = this.selectedNode.fields.length - 1;
            }
        },
        removeField(index) {
            if (this.selectedNode) {
                this.selectedNode.fields.splice(index, 1);
            }
        },
        exportJSON() {
            const result = this.nodes.map(node => ({
                id: node.id,
                name: node.text,
                completed: node.status === '完成',
                fields: node.fields // ✅ fields 已是 el-tree 結構
            }));
            console.log("🚀 匯出 JSON:", JSON.stringify(result, null, 2));
            alert("已匯出，請打開 console 查看結果！");
        },
        addTreeRootNode() {
            if (this.selectedNode) {
                this.selectedNode.fields.push({
                id: Date.now(),
                label: '新節點',
                checked: false,
                children: []
                });
            }
        },
        handleTreeCheckChange(data, checked) {
            data.checked = checked;
            if (!Array.isArray(data.children)) {
                this.$set(data, 'children', []);
            }
            this.updateParentCheckedState(this.selectedNode.fields);
        },
        updateParentCheckedState(nodes) {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                this.updateParentCheckedState(node.children);
                const allChecked = node.children.every(c => c.checked);
                const someChecked = node.children.some(c => c.checked);
                node.checked = allChecked || someChecked;
                }
            });
        },
        addTreeNodeToField() {
            if (this.selectedField && Array.isArray(this.selectedField.children)) {
                this.selectedField.children.push({
                  id: Date.now(),
                  label: '新節點',
                  checked: false,
                  children: []
                });
            }
        },

    },
    mounted() {
        this.fetchData();
    }
});

app.use(ElementPlus);
app.mount("#app");

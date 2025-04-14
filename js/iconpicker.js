/**
 * jQuery Icon Picker
 * v1.0.0
 * Bootstrap 5.3.3 ve Font Awesome 5 uyumlu şık icon seçici
 */

;(function($) {
    'use strict';

    // IconPicker yapılandırıcı
    var IconPicker = function(element, options) {
        this.element = $(element);
        this.settings = $.extend({}, IconPicker.DEFAULTS, options);
        this.init();
    };

    // Varsayılan seçenekler
    IconPicker.DEFAULTS = {
        title: 'İkon Seçici',
        selectedIcon: 'fas fa-heart',
        defaultCategory: 'solid',
        height: 280,
        hideOnSelect: true,
        showFooter: true,
        searchText: 'İkon Ara...',
        noResultsText: 'Sonuç bulunamadı',
        borderRadius: '.375rem',
        backdropOpacity: 0.7,
        placement: 'bottom',
        modalMode: false,
        zIndex: 1040,
        inlineMode: false,
        templates: {
            search: '<div class="iconpicker-search mb-2">' +
                    '<span class="iconpicker-search-icon"><i class="fas fa-search"></i></span>' +
                    '<input type="text" class="form-control" placeholder="{searchText}">' +
                    '</div>',
            footer: '<div class="iconpicker-footer p-2"></div>',
            iconItem: '<div class="iconpicker-icon" data-icon="{icon}" title="{icon}"><i class="{icon}"></i></div>',
            iconCategory: '<div class="iconpicker-category" data-category="{category}">{title}</div>'
        },
        categories: {
            solid: {
                title: 'Solid',
                prefix: 'fas'
            },
            regular: {
                title: 'Regular',
                prefix: 'far'
            },
            brands: {
                title: 'Markalar',
                prefix: 'fab'
            }
        }
    };

    // Script yolunu al
    IconPicker.getScriptPath = function() {
        // IconPicker.js dosyasının yolunu bul
        var scriptTags = document.getElementsByTagName('script');
        var iconPickerPath = '';
        
        for (var i = 0; i < scriptTags.length; i++) {
            var src = scriptTags[i].src;
            if (src && src.indexOf('iconpicker.js') !== -1) {
                iconPickerPath = src.split('?')[0]; // URL parametrelerini kaldır
                break;
            }
        }
        
        if (!iconPickerPath) {
            console.warn('iconpicker.js dosya yolu bulunamadı!');
            return '';
        }
        
        // Dosya adını kaldır, sadece dizin yolunu al
        var basePath = iconPickerPath.substring(0, iconPickerPath.lastIndexOf('/') + 1);
        
        return basePath;
    };

    // IconPicker prototip metodları
    IconPicker.prototype = {
        init: function() {
            var self = this;
            
            // Benzersiz ID ver
            this.uniqueId = 'iconpicker_' + Math.floor(Math.random() * 10000);
            this.element.attr('data-iconpicker-id', this.uniqueId);
            
            // İkon değeri eğer verilmişse input'a ata
            if (this.element.is('input')) {
                if (!this.element.val() && this.settings.selectedIcon) {
                    this.element.val(this.settings.selectedIcon);
                }
                
                // Eğer element bir icon-picker ise ve zaten bir inputgroup içinde değilse,
                // otomatik olarak gerekli yapıyı oluştur
                if (this.element.hasClass('icon-picker') && !this.element.parent().hasClass('input-group')) {
                    // İcon class'ını al
                    var iconClass = this.element.val() || this.settings.selectedIcon;
                    
                    // Input etrafına wrapper ekle
                    this.element.wrap('<div class="input-group"></div>');
                    
                    // Preview iconu ekle - Temiz div ve i yapısı
                    var previewDiv = $('<div class="preview-icon"></div>');
                    var iconElement = $('<i></i>').addClass(iconClass);
                    previewDiv.append(iconElement);
                    this.element.before(previewDiv);
                    
                    // Preview elementi için ayar ekle
                    this.settings.iconPreview = iconElement;
                    
                    // Element bir modal içinde ise modalMode ayarını aktifleştir
                    if (this.element.closest('.modal').length > 0 && !this.settings.modalMode) {
                        this.settings.modalMode = true;
                        this.settings.zIndex = 1056;
                    }
                }
            }
            
            // İkon önizleme elementini ayarla
            if (this.settings.iconPreview) {
                var previewElem = $(this.settings.iconPreview);
                var iconClass = this.element.val() || this.settings.selectedIcon;
                
                // Sınıfları temizle ve ikonu ayarla
                previewElem.attr('class', '');
                previewElem.addClass(iconClass);
            }
            
            // İkon verilerini depolama
            this.iconData = {};
            
            // Inline Mode ise farklı davran
            if (this.settings.inlineMode) {
                this._initInlineMode();
                return this;
            }
            
            // Dropdown oluştur
            this._createDropdown();
            
            // İkon verilerini yükle
            this._loadIconsData();
            
            // İnput tıklama olayı
            if (this.element.is(':visible')) {
                this.element.on('click', function(e) {
                    e.stopPropagation();
                    self.toggleDropdown();
                });
            }
            
            // İkon butonu tıklama olayı
            if (this.settings.iconButton) {
                $(this.settings.iconButton).on('click', function(e) {
                    e.stopPropagation();
                    // Eğer zaten açıksa ve aynı buton tekrar tıklandıysa kapat
                    if (self.dropdown.hasClass('show') && self.lastClickedButton === this) {
                        self.hideDropdown();
                    } else {
                        // Tıklanan butonu kaydet
                        self.lastClickedButton = this;
                        self.showDropdown();
                    }
                });
            }
            
            // Dışarı tıklandığında kapat
            $(document).on('click', function() {
                self.hideDropdown();
            });
            
            // ESC tuşuna basıldığında kapat
            $(document).on('keydown', function(e) {
                if (e.keyCode === 27) {
                    self.hideDropdown();
                }
            });
            
            // Dropdown içine tıklandığında dışarı tıklama eventini engelle
            this.dropdown.on('click mousedown', function(e) {
                e.stopPropagation();
            });
            
            // Dropdown'a dokunma olayını engelle (mobil cihazlar için)
            this.dropdown.on('touchstart touchmove touchend', function(e) {
                e.stopPropagation();
            });
            
            // Arama inputu içindeki tıklamaları özel olarak yönet
            if (this.settings.modalMode) {
                // Bu kısım showDropdown'da ele alınacak
            } else {
                // Normal modda (modal dışında)
                this.dropdown.find('.iconpicker-search input').on('click mousedown focus', function(e) {
                    e.stopPropagation();
                    $(this).focus();
                });
            }
            
            return this;
        },
        
        // Dropdown oluştur
        _createDropdown: function() {
            var self = this;
            
            // Ana konteyner
            this.dropdown = $('<div class="iconpicker-dropdown"></div>');
            
            // Modal içindeyse z-index ayarla
            if (this.settings.modalMode) {
                this.dropdown.addClass('iconpicker-modal-mode');
            }
            
            // Başlık ekle
            if (this.settings.title) {
                var header = $('<div class="iconpicker-header"></div>');
                header.html('<h6 class="mb-2">' + this.settings.title + '</h6>');
                this.dropdown.append(header);
                
                // Arama kutusunu ekle
                var searchHtml = this.settings.templates.search
                    .replace('{searchText}', this.settings.searchText);
                var search = $(searchHtml);
                header.append(search);
                
                // Arama fonksiyonu
                search.find('input')
                .on('keyup', function(e) {
                    // Arama yap
                        var searchText = $(this).val().toLowerCase();
                        self._filterIcons(searchText);
                })
                // Modal için özel durumlar _createDropdown yerine showDropdown'da ele alınacak
                .prop('disabled', false);
            }
            
            // Kategori seçicisi
            var categoryContainer = $('<div class="iconpicker-categories"></div>');
            this.dropdown.append(categoryContainer);
            
            // Kategorileri ekle
            $.each(this.settings.categories, function(catId, category) {
                var categoryHtml = self.settings.templates.iconCategory
                    .replace('{category}', catId)
                    .replace('{title}', category.title);
                
                var categoryElem = $(categoryHtml);
                categoryContainer.append(categoryElem);
                
                // İlk kategoriye active sınıfı ekle
                if (catId === self.settings.defaultCategory) {
                    categoryElem.addClass('active');
                }
                
                // Kategori tıklama eventi
                categoryElem.on('click', function() {
                    categoryContainer.find('.iconpicker-category').removeClass('active');
                    $(this).addClass('active');
                    var category = $(this).data('category');
                    self._loadCategoryIcons(category);
                });
            });
            
            // İçerik alanı
            this.iconsContainer = $('<div class="iconpicker-content"></div>');
            if (this.settings.height) {
                this.iconsContainer.css('max-height', this.settings.height + 'px');
            }
            this.dropdown.append(this.iconsContainer);
            
            // Yükleniyor içeriği
            this.iconsContainer.html('<div class="iconpicker-loading"><div class="iconpicker-loading-spinner"></div> Yükleniyor...</div>');
            
            // Alt bilgi
            if (this.settings.showFooter) {
                var footer = $(this.settings.templates.footer);
                this.dropdown.append(footer);
                
                // Seçilen ikon bilgisi
                var selectedIcon = this.element.val() || this.settings.selectedIcon;
                footer.find('.iconpicker-selected-icon').html('<i class="' + selectedIcon + '"></i> <span>' + selectedIcon + '</span>');
                
                // Seç butonu
                footer.find('.iconpicker-select-btn').on('click', function() {
                    var iconClass = footer.find('.iconpicker-selected-icon i').attr('class');
                    self._selectIcon(iconClass);
                    self.hideDropdown();
                });
            }
            
            // Document body'e ekle
            $('body').append(this.dropdown);
            
            return this;
        },
        
        // İkon verilerini yükle
        _loadIconsData: function() {
            var self = this;
            
            // İkonları JS dosyasından yükle
            if (typeof window.FontAwesomeIconset !== 'undefined') {
                // Önce tüm kategorileri temizle
                self.iconData = {};
                
                // Kategori haritalaması
                var prefixMap = {
                    'fas': 'solid',
                    'far': 'regular',
                    'fab': 'brands'
                };
                
                // İkonları kategorilerine göre sınıflandır
                var icons = window.FontAwesomeIconset.icons || [];
                if (icons.length === 0 && window.FontAwesomeIconset.allVersions && 
                    window.FontAwesomeIconset.allVersions.length > 0 && 
                    window.FontAwesomeIconset.allVersions[0].icons) {
                    icons = window.FontAwesomeIconset.allVersions[0].icons;
                }
                
                // Önce kategorileri hazırla
                Object.keys(prefixMap).forEach(function(prefix) {
                    var category = prefixMap[prefix];
                    self.iconData[category] = [];
                });
                
                // İkonları kategorilere dağıt
                icons.forEach(function(icon) {
                    if (icon === 'empty') return;
                    
                    var parts = icon.split(' ');
                    var prefix = parts[0];
                    var iconName = parts.length > 1 ? parts[1] : '';
                    
                    if (prefix && iconName && prefixMap[prefix]) {
                        var category = prefixMap[prefix];
                        var cleanName = iconName.replace('fa-', '');
                        self.iconData[category].push(cleanName);
                    }
                });
                
                // Yeni categories objesi oluştur
                var newCategories = {};
                
                // Sadece içinde ikon olan kategorileri al
                Object.keys(prefixMap).forEach(function(prefix) {
                    var category = prefixMap[prefix];
                    if (self.iconData[category] && self.iconData[category].length > 0) {
                        newCategories[category] = {
                            title: self.settings.categories[category].title,
                            prefix: prefix
                        };
                    }
                });
                
                // Settings'i güncelle
                self.settings.categories = newCategories;
                
                // Varsayılan kategoriyi güncelle
                var categories = Object.keys(newCategories);
                if (categories.length > 0) {
                    if (!newCategories[self.settings.defaultCategory]) {
                        self.settings.defaultCategory = categories[0];
                    }
                    
                    // Varsayılan kategori ikonlarını yükle
                    if (self.settings.inlineMode) {
                        self._loadCategoryIconsInline(self.settings.defaultCategory);
                    } else {
                        self._loadCategoryIcons(self.settings.defaultCategory);
                    }
                } else {
                    self.iconsContainer.html('<div class="alert alert-warning">Hiç ikon bulunamadı.</div>');
                }
                
                return true;
            }
            
            return this._loadIconsFromJS();
        },
        
        // İkonları JS dosyasından yükle
        _loadIconsFromJS: function() {
            var self = this;
            
            // Önce window.FontAwesomeIconset kontrolü
            if (typeof window.FontAwesomeIconset !== 'undefined') {
                return this._processIconsetData();
            }
            
            // FontAwesomeIconset tanımlı değilse, JS dosyasını dinamik olarak yükle
            var basePath = IconPicker.getScriptPath();
            var iconsetPath = basePath + 'iconset/iconset-fontawesome-5-all.js';
            
            console.log('FontAwesomeIconset yükleniyor:', iconsetPath);
            
            // Yükleniyor içeriğini göster
            self.iconsContainer.html('<div class="iconpicker-loading"><div class="iconpicker-loading-spinner"></div> İkonlar yükleniyor...</div>');
            
            // Skript elementi oluştur
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = iconsetPath;
            
            var loaded = false;
            
            // Yüklendikten sonra işleme
            script.onload = script.onreadystatechange = function() {
                if (!loaded && (!this.readyState || this.readyState === 'complete')) {
                    loaded = true;
                    
                    // FontAwesomeIconset veri işleme
                    if (self._processIconsetData()) {
                        console.log('Iconset başarıyla yüklendi ve işlendi.');
                    } else {
                        console.error('Iconset verisi işlenemedi. Icon dosyası: ' + iconsetPath);
                        self.iconsContainer.html('<div class="alert alert-danger">İkon verisi yüklenemedi veya işlenemedi. <code>' + iconsetPath + '</code> dosyasını kontrol edin.</div>');
                    }
                }
            };
            
            // Yükleme hatası
            script.onerror = function() {
                console.error('Iconset dosyası yüklenemedi:', iconsetPath);
                self.iconsContainer.html('<div class="alert alert-danger">İkon dosyası bulunamadı: <code>' + iconsetPath + '</code></div>');
            };
            
            // Sayfaya ekle
            document.getElementsByTagName('head')[0].appendChild(script);
            
            // Devam eden bir yükleme olduğu için false döndür
            return false;
        },
        
        // IconsetData işleme
        _processIconsetData: function() {
            var self = this;
            
            // FontAwesomeIconset kontrolü
            if (typeof window.FontAwesomeIconset === 'undefined') {
                console.warn('FontAwesomeIconset bulunamadı.');
                self.iconsContainer.html('<div class="alert alert-danger">FontAwesomeIconset tanımlı değil.</div>');
                return false;
            }
            
            try {
                self.iconData = {};
                
                // Veriyi doğru formata dönüştürüp yükle
                var icons = window.FontAwesomeIconset.icons || [];
                
                if (!icons || icons.length === 0) {
                    // allVersions arrays formatını kontrol et
                    if (window.FontAwesomeIconset.allVersions && 
                        window.FontAwesomeIconset.allVersions.length > 0 && 
                        window.FontAwesomeIconset.allVersions[0].icons) {
                        icons = window.FontAwesomeIconset.allVersions[0].icons;
                    } else {
                        console.warn('FontAwesomeIconset içinde ikon dizisi bulunamadı');
                        self.iconsContainer.html('<div class="alert alert-danger">Font Awesome ikonları bulunamadı. Veri yapısı uyumsuz.</div>');
                        return false;
                    }
                }
                
                // Kategori haritalaması
                var prefixMap = {
                    'fas': 'solid',
                    'far': 'regular',
                    'fab': 'brands'
                };
                
                // Her kategori için boş dizi oluştur
                Object.keys(self.settings.categories).forEach(function(category) {
                    self.iconData[category] = [];
                });
                
                // İkonları kategorilerine göre sınıflandır
                icons.forEach(function(icon) {
                    if (icon === 'empty') return; // Boş değeri atla
                    
                    // Prefix'i belirle (fas, far, fab, vb.)
                    var parts = icon.split(' ');
                    var prefix = parts[0];
                    var iconName = parts.length > 1 ? parts[1] : '';
                    
                    // Prefix'e göre kategoriyi belirle
                    if (prefix && iconName && prefixMap[prefix]) {
                        var category = prefixMap[prefix];
                        // fa- önekini kaldır ve ikonu ekle
                        var cleanName = iconName.replace('fa-', '');
                        self.iconData[category].push(cleanName);
                    }
                });
                
                // Kategori dizileri boş mu kontrol et
                var hasIcons = false;
                Object.keys(self.iconData).forEach(function(category) {
                    if (self.iconData[category].length > 0) {
                        hasIcons = true;
                    }
                });
                
                if (!hasIcons) {
                    console.warn('Hiçbir kategori için ikon yüklenemedi');
                    self.iconsContainer.html('<div class="alert alert-danger">İkon verileri bulunamadı veya kategorilere ayrılamadı.</div>');
                    return false;
                }
                
                // Varsayılan kategori ikonlarını yükle
                if (self.settings.inlineMode) {
                    self._loadCategoryIconsInline(self.settings.defaultCategory);
                } else {
                self._loadCategoryIcons(self.settings.defaultCategory);
                }
                return true;
            } catch (e) {
                console.error('İkon verileri işlenirken hata oluştu:', e);
                self.iconsContainer.html('<div class="alert alert-danger">İkon verileri işlenirken bir hata oluştu: <code>' + e.message + '</code></div>');
                return false;
            }
        },
        
        // Dropdown pozisyonunu ayarla
        _positionDropdown: function() {
            // Dropdown yoksa işlemi iptal et
            if (!this.dropdown) return this;
            
            // Tıklanan elemanın pozisyonunu belirleme (buton veya input)
            var triggerElem = this.settings.iconButton ? $(this.settings.iconButton) : this.element;
            var offset = triggerElem.offset();
            var triggerWidth = triggerElem.outerWidth();
            var triggerHeight = triggerElem.outerHeight();
            
            var width = this.dropdown.outerWidth();
            var height = this.dropdown.outerHeight();
            var windowWidth = $(window).width();
            var windowHeight = $(window).height();
            var scrollTop = $(window).scrollTop();
            var scrollLeft = $(window).scrollLeft();
            
            // Varsayılan pozisyon (elemanın altında, sol hizalı)
            var left = offset.left;
            var top = offset.top + triggerHeight + 2; // 2px boşluk
            
            // Modal içinde kullanılıyorsa farklı pozisyonlama stratejisi
            if (this.settings.modalMode) {
                // Modal içindeki pozisyonu - input'a göreceli
                var modalDialog = triggerElem.closest('.modal-dialog');
                var modalOffset = modalDialog.offset();
                var modalWidth = modalDialog.width();
                var modalScrollTop = modalDialog.scrollTop();
                
                // Dropdown genişliğini modalın genişliğine göre ayarla
                var maxWidth = modalWidth * 0.8; // Modalın %80'i
                if (width > maxWidth) {
                    this.dropdown.css('max-width', maxWidth + 'px');
                    width = maxWidth;
                }
                
                // Modalın içinde merkezi pozisyon
                left = modalOffset.left + (modalWidth / 2) - (width / 2);
                
                // Sağ/Sol taşma kontrolü
                if (left < 10) left = 10;
                if (left + width > windowWidth - 10) left = windowWidth - width - 10;
                
                // Modal içinde yukarı/aşağı konumlandırma
                var modalPosition = modalDialog.position();
                top = offset.top + triggerHeight + 5;
                
                // Alt kenara taşma kontrolü
                if (top + height > windowHeight - 10) {
                    top = offset.top - height - 5;
                    
                    // Üst kenara taşma kontrolü
                    if (top < 10) {
                        top = 10;
                        // İçeriği kaydırmak için max-height ayarla
                        var availableHeight = windowHeight - 20;
                        this.iconsContainer.css('max-height', (availableHeight - 150) + 'px');
                    }
                }
                
                // Position fixed kullan
                this.dropdown.css('position', 'fixed');
            } else {
                // Standart pozisyonlama (modal dışında kullanım)
            // Sağ kenardan taşarsa
            if (left + width > windowWidth + scrollLeft) {
                // Sağa doğru taşarsa, sağ kenarları hizala
                left = offset.left + triggerWidth - width;
                
                // Hala sol kenardan taşarsa
                if (left < scrollLeft) {
                    left = scrollLeft + 10;
                }
            }
            
            // Sol kenardan taşarsa
            if (left < scrollLeft) {
                left = scrollLeft + 10;
            }
            
            // Alt kenardan taşarsa, üste yerleştir
            if (top + height > windowHeight + scrollTop) {
                top = offset.top - height - 2; // 2px boşluk
                
                // Eğer üst kısımda da yeterli alan yoksa
                if (top < scrollTop) {
                    // Mümkün olduğunca üste yerleştir
                    top = scrollTop + 10;
                    
                    // İçeriği kaydırmak için max-height ayarla
                    var availableHeight = windowHeight - 20; // 10px üst ve alt marj
                    if (height > availableHeight) {
                        this.iconsContainer.css('max-height', (availableHeight - 150) + 'px'); // Header ve footer için boşluk bırak
                    }
                }
                }
                
                this.dropdown.css('position', 'absolute');
            }
            
            // Pozisyonu ayarla
            this.dropdown.css({
                top: top + 'px',
                left: left + 'px'
            });
            
            return this;
        },
        
        // Dropdown göster/gizle
        toggleDropdown: function() {
            if (!this.dropdown) return this; // Dropdown yoksa işlemi iptal et
            
            if (this.dropdown.hasClass('show')) {
                this.hideDropdown();
            } else {
                this.showDropdown();
            }
            return this;
        },
        
        // Dropdown göster
        showDropdown: function() {
            if (!this.dropdown) return this; // Dropdown yoksa işlemi iptal et
            
            // Önce pozisyonu ayarla, sonra göster
            this._positionDropdown();
            this.dropdown.addClass('show');
            
            // Modal içinde kullanılıyorsa ek z-index ayarı
            if (this.settings.modalMode) {
                this.dropdown.addClass('iconpicker-modal-mode');
                
                // Modal içinde input olaylarını özel olarak yönet
                this._setupModalSearchInput();
            }
            
            // Pencere yeniden boyutlandığında pozisyonu güncelle
            var self = this;
            $(window).on('resize.iconpicker scroll.iconpicker', function() {
                if (self.dropdown && self.dropdown.hasClass('show')) {
                    self._positionDropdown();
                }
            });
            
            return this;
        },
        
        // Modal içindeki arama inputunu özel olarak ayarla
        _setupModalSearchInput: function() {
            var self = this;
            var searchContainer = this.dropdown.find('.iconpicker-search');
            
            // İlk olarak mevcut input'u kaldır
            var oldInput = searchContainer.find('input');
            var placeholder = oldInput.attr('placeholder');
            oldInput.remove();
            
            // Yeni input oluştur ve özellikleri ayarla
            var newInput = $('<input type="text" class="form-control iconpicker-search-input-modal" placeholder="' + placeholder + '">');
            
            // Input'u search container'a ekle
            searchContainer.find('.iconpicker-search-icon').after(newInput);
            
            // Arama işlevini ayarla
            newInput.on('keyup input', function() {
                var searchText = $(this).val().toLowerCase();
                self._filterIcons(searchText);
            });
            
            // Tıklama olayını diğer tüm olaylardan izole et
            newInput.on('mousedown mouseup click focus', function(e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (e.type === 'click' || e.type === 'focus') {
                    $(this).focus();
                }
            });
            
            // Input için genel document olaylarını önle
            $(document).on('mousedown.iconpickerInput', function(e) {
                if ($(e.target).closest('.iconpicker-search').length) {
                    e.stopPropagation();
                    return false;
                }
            });
        },
        
        // Dropdown gizle
        hideDropdown: function() {
            if (!this.dropdown) return this; // Dropdown yoksa işlemi iptal et
            
            this.dropdown.removeClass('show');
            
            // Resize event dinleyicisini kaldır
            $(window).off('resize.iconpicker scroll.iconpicker');
            
            // Modal içinde kullanıldıysa document olay dinleyicisini kaldır
            $(document).off('mousedown.iconpickerInput');
            
            // Temizle
            this.lastClickedButton = null;
            
            return this;
        },
        
        // Kategori ikonlarını yükle
        _loadCategoryIcons: function(category) {
            var self = this;
            
            // Kategorinin var olup olmadığını kontrol et
            if (!this.settings.categories[category]) {
                console.error('Kategori bulunamadı: ' + category);
                return this;
            }
            
            // Yükleniyor göster
            this.iconsContainer.html('<div class="iconpicker-loading"><div class="iconpicker-loading-spinner"></div> Yükleniyor...</div>');
            
            // İkonları yükle
            setTimeout(function() {
                var categoryData = self.settings.categories[category];
                var prefix = categoryData.prefix;
                
                // İlgili kategori için ikon verilerini kontrol et
                if (!self.iconData || !self.iconData[category] || !Array.isArray(self.iconData[category])) {
                    self.iconsContainer.html('<div class="alert alert-warning">Bu kategori için ikonlar bulunamadı.</div>');
                    return;
                }
                
                var icons = self.iconData[category];
                
                // İkon konteynerini temizle
                var iconsWrapper = $('<div class="iconpicker-icons"></div>');
                
                // İkonları ekle
                $.each(icons, function(i, icon) {
                    // İkon sınıfını oluştur
                    var iconClass = '';
                    
                    // Eğer ikon adı tam bir sınıf ise (eski formatla uyumluluk için)
                    if (icon.indexOf(' ') !== -1) {
                        iconClass = icon; // Tam sınıf
                    } else {
                        // Yeni format: ikon adları prefix olmadan geliyor
                        iconClass = prefix + ' fa-' + icon;
                    }
                    
                    // Temiz HTML yapısı oluştur
                    var iconHtml = self.settings.templates.iconItem
                        .replace(/\{icon\}/g, iconClass);
                    
                    var iconElem = $(iconHtml);
                    
                    // Icon tag'ının içinde sadece ikon sınıfının olduğundan emin ol
                    iconElem.find('i').attr('class', '').addClass(iconClass);
                    
                    // Seçili ikonu işaretle
                    if (iconClass === self.element.val()) {
                        iconElem.addClass('selected');
                    }
                    
                    // İkon tıklama olayı
                    iconElem.on('click', function() {
                        // Diğer ikonlardan selected sınıfını kaldır
                        iconsWrapper.find('.iconpicker-icon').removeClass('selected');
                        
                        // Bu ikona selected sınıfı ekle
                        $(this).addClass('selected');
                        
                        // İkon sınıfını al ve seç
                        var iconClass = $(this).find('i').attr('class');
                        self._selectIcon(iconClass);
                        
                        // Seçimden sonra dropdown'ı gizle (normal modda)
                        if (self.settings.hideOnSelect && !self.settings.inlineMode) {
                            self.hideDropdown();
                        }
                    });
                    
                    iconsWrapper.append(iconElem);
                });
                
                // İkonları ekrana ekle
                self.iconsContainer.html('');
                
                // Sonuç bilgisi
                var resultCount = icons.length;
                var resultsInfo = $('<div class="iconpicker-search-results"></div>');
                resultsInfo.html(resultCount + ' ikon bulundu');
                resultsInfo.hide(); // Başlangıçta gizle, arama yapılınca gösterilecek
                
                self.iconsContainer.append(resultsInfo);
                self.iconsContainer.append(iconsWrapper);
                
            }, 150);
            
            return this;
        },
        
        // İkonları filtrele
        _filterIcons: function(searchText) {
            var icons = this.iconsContainer.find('.iconpicker-icon');
            var visibleCount = 0;
            
            if (!searchText) {
                icons.show();
                this.iconsContainer.find('.iconpicker-search-results').hide();
                return this;
            }
            
            icons.each(function() {
                var icon = $(this);
                var iconClass = icon.data('icon').toLowerCase();
                
                // Arama sorgusunu ikon sınıfı ile karşılaştır
                // fa- önekini veya benzer ön ve son ekleri dikkate almadan aramayı daha etkili hale getir
                var cleanIconClass = iconClass
                    .replace(/\s?fa[srlbd]?\s/g, ' ') // fas, far, fab, fal, vb prefixleri çıkar
                    .replace(/fa-/g, '') // fa- önekini çıkar
                    .trim(); // boşlukları temizle
                
                // Hem orijinal hem de temizlenmiş sınıfta ara
                if (iconClass.indexOf(searchText) !== -1 || cleanIconClass.indexOf(searchText) !== -1) {
                    icon.show();
                    visibleCount++;
                } else {
                    icon.hide();
                }
            });
            
            // Sonuç bilgisi
            var resultsInfo = this.iconsContainer.find('.iconpicker-search-results');
            
            if (visibleCount === 0) {
                resultsInfo.html('<div class="iconpicker-no-results">' + this.settings.noResultsText + '</div>');
            } else {
                resultsInfo.html(visibleCount + ' sonuç bulundu');
            }
            
            resultsInfo.show();
            
            return this;
        },
        
        // İkon seç
        _selectIcon: function(icon) {
            // İkon sınıfını al
            var iconClass = $(icon).find('i').attr('class') || icon;
            
            // Input ve preview elementlerini al
            var $input = this.element;
            var $preview = this.settings.iconPreview;
            
            if ($preview && $preview.length) {
                // İkon sınıfını temizle ve yeni sınıfı ekle
                $preview.attr('class', '').addClass(iconClass);
            }
            
            // Input değerini güncelle
            $input.val(iconClass);
            
            // Dropdown modunda dropdown'ı kapat
            if (!this.settings.inlineMode) {
                this.hideDropdown();
            }
            
            // Seçim olayını tetikle
            this.element.trigger('change').trigger('iconSelected', { iconClass: iconClass });
            
            return this;
        },
        
        // Inline Mode için özel init metodu
        _initInlineMode: function() {
            var self = this;
            
            // Element ID'sini al
            var inputId = this.element.attr('id') || 'iconpicker-input-' + Math.floor(Math.random() * 1000);
            
            // İnput'u gizle veya salt okunur yap
            this.element.attr('readonly', true).addClass('iconpicker-inline-input');
            
            // Icon picker konteynerini oluştur
            var containerId = inputId + '-container';
            var container = $('<div class="iconpicker-inline-container" id="' + containerId + '"></div>');
            
            // Modal içindeyse CSS sınıfını ekle
            if (this.settings.modalMode) {
                container.addClass('iconpicker-inline-modal-mode');
            }
            
            // Başlık oluştur
            if (this.settings.title) {
                var header = $('<div class="iconpicker-header p-2 border-bottom"></div>');
                header.html('<h6 class="mb-2">' + this.settings.title + '</h6>');
                
                // Arama kutusunu ekle
                var searchHtml = this.settings.templates.search
                    .replace('{searchText}', this.settings.searchText);
                var search = $(searchHtml);
                header.append(search);
                
                container.append(header);
                
                // Arama fonksiyonu
                search.find('input').on('keyup', function() {
                    var searchText = $(this).val().toLowerCase();
                    self._filterIcons(searchText);
                });
            }
            
            // Kategori seçicisini oluştur
            var categoryContainer = $('<div class="iconpicker-categories p-2"></div>');
            container.append(categoryContainer);
            
            // Kategorileri ekle
            $.each(this.settings.categories, function(catId, category) {
                var categoryHtml = self.settings.templates.iconCategory
                    .replace('{category}', catId)
                    .replace('{title}', category.title);
                
                var categoryElem = $(categoryHtml);
                categoryContainer.append(categoryElem);
                
                // İlk kategoriye active sınıfı ekle
                if (catId === self.settings.defaultCategory) {
                    categoryElem.addClass('active');
                }
                
                // Kategori tıklama olayı
                categoryElem.on('click', function() {
                    categoryContainer.find('.iconpicker-category').removeClass('active');
                    $(this).addClass('active');
                    var category = $(this).data('category');
                    self._loadCategoryIconsInline(category, container);
                });
            });
            
            // İçerik alanı
            this.iconsContainer = $('<div class="iconpicker-content"></div>');
            if (this.settings.height) {
                this.iconsContainer.css('max-height', this.settings.height + 'px');
            }
            container.append(this.iconsContainer);
            
            // Yükleniyor içeriğini göster
            this.iconsContainer.html('<div class="iconpicker-loading"><div class="iconpicker-loading-spinner"></div> Yükleniyor...</div>');
            
            // Alt bilgi (footer) ekle
            if (this.settings.showFooter) {
                var footer = $(this.settings.templates.footer);
                container.append(footer);
                
                // Seçilen ikon bilgisi
                var selectedIcon = this.element.val() || this.settings.selectedIcon;
                footer.find('.iconpicker-selected-icon').html('<i class="' + selectedIcon + '"></i> <span>' + selectedIcon + '</span>');
                
                // Seç butonu
                footer.find('.iconpicker-select-btn').on('click', function() {
                    var iconClass = footer.find('.iconpicker-selected-icon i').attr('class');
                    self._selectIcon(iconClass);
                });
            }
            
            // Input'tan sonra konteyneri ekle
            this.element.after(container);
            
            // İkon verilerini yükle
            this.iconData = {};
            this._loadIconsData();
            
            return this;
        },
        
        // Inline mode için kategori ikonlarını yükle
        _loadCategoryIconsInline: function(category, container) {
            var self = this;
            
            // Kategorinin var olup olmadığını kontrol et
            if (!this.settings.categories[category]) {
                console.error('Kategori bulunamadı: ' + category);
                return this;
            }
            
            // Yükleniyor göster
            this.iconsContainer.html('<div class="iconpicker-loading"><div class="iconpicker-loading-spinner"></div> Yükleniyor...</div>');
            
            // İkonları yükle
            setTimeout(function() {
                var categoryData = self.settings.categories[category];
                var prefix = categoryData.prefix;
                
                // İlgili kategori için ikon verilerini kontrol et
                if (!self.iconData || !self.iconData[category] || !Array.isArray(self.iconData[category])) {
                    self.iconsContainer.html('<div class="alert alert-warning">Bu kategori için ikonlar bulunamadı.</div>');
                    return;
                }
                
                var icons = self.iconData[category];
                
                // İkon konteynerini temizle
                var iconsWrapper = $('<div class="iconpicker-icons"></div>');
                
                // İkonları ekle
                $.each(icons, function(i, icon) {
                    // İkon sınıfını oluştur
                    var iconClass = '';
                    
                    // Eğer ikon adı tam bir sınıf ise (eski formatla uyumluluk için)
                    if (icon.indexOf(' ') !== -1) {
                        iconClass = icon; // Tam sınıf
                    } else {
                        // Yeni format: ikon adları prefix olmadan geliyor
                        iconClass = prefix + ' fa-' + icon;
                    }
                    
                    // Temiz HTML yapısı oluştur
                    var iconHtml = self.settings.templates.iconItem
                        .replace(/\{icon\}/g, iconClass);
                    
                    var iconElem = $(iconHtml);
                    
                    // Icon tag'ının içinde sadece ikon sınıfının olduğundan emin ol
                    iconElem.find('i').attr('class', '').addClass(iconClass);
                    
                    // Seçili ikonu işaretle
                    if (iconClass === self.element.val()) {
                        iconElem.addClass('selected');
                    }
                    
                    // İkon tıklama olayı (Inline mode)
                    iconElem.on('click', function() {
                        try {
                            // İkon elementini seç
                            var $icon = $(this);
                            
                            // Diğer ikonlardan selected sınıfını kaldır
                            iconsWrapper.find('.iconpicker-icon').removeClass('selected');
                            
                            // Bu ikona selected sınıfı ekle
                            $icon.addClass('selected');
                            
                            // İkon sınıfını al ve seç
                            var iconClass = $icon.find('i').attr('class');
                            self._selectIcon(iconClass);
                            
                            // Değişiklik olayını tetikle
                            self.element.trigger('change');
                        } catch (error) {
                            console.error('İkon seçimi sırasında hata:', error);
                        }
                    });
                    
                    iconsWrapper.append(iconElem);
                });
                
                // İkonları ekrana ekle
                self.iconsContainer.html('');
                
                // Sonuç bilgisi
                var resultCount = icons.length;
                var resultsInfo = $('<div class="iconpicker-search-results"></div>');
                resultsInfo.html(resultCount + ' ikon bulundu');
                resultsInfo.hide(); // Başlangıçta gizle, arama yapılınca gösterilecek
                
                self.iconsContainer.append(resultsInfo);
                self.iconsContainer.append(iconsWrapper);
                
            }, 150);
            
            return this;
        },
        
        // Direkt olarak previewı güncelle
        _updatePreviewDirectly: function(iconClass) {
            var self = this;
            
            if (this.settings.iconPreview) {
                try {
                    // Debug - Preview seçicisini göster
                    console.log('Preview seçicisi:', this.settings.iconPreview);
                    
                    // Preview seçicisini al
                    var previewSelector = this.settings.iconPreview;
                    
                    // jQuery nesnesi mi yoksa seçici mi kontrol et
                    var $preview;
                    if (typeof previewSelector === 'object' && previewSelector instanceof jQuery) {
                        $preview = previewSelector;
                        console.log('jQuery nesnesi kullanılıyor:', $preview.length, 'eleman bulundu');
                    } else {
                        // İlk boşluğa kadar olan kısmı al (sadece i eklentisi varsa)
                        var selectorParts = previewSelector.split(' ');
                        var mainSelector = selectorParts[0];
                        
                        // Seçici # veya . içermiyorsa ekle
                        if (!mainSelector.startsWith('#') && !mainSelector.startsWith('.')) {
                            mainSelector = '.' + mainSelector;
                        }
                        
                        // Önce ana seçici ile ara
                        $preview = $(mainSelector);
                        console.log('Ana seçici:', mainSelector, $preview.length, 'eleman bulundu');
                        
                        // Eğer bulunamazsa tam seçici ile dene
                        if ($preview.length === 0 && selectorParts.length > 1) {
                            if (!previewSelector.startsWith('#') && !previewSelector.startsWith('.')) {
                                previewSelector = '.' + previewSelector;
                            }
                            $preview = $(previewSelector);
                            console.log('Tam seçici:', previewSelector, $preview.length, 'eleman bulundu');
                        }
                        
                        // Hala bulunamadıysa, i etiketine erişebilecek bir yol dene
                        if ($preview.length === 0) {
                            // .preview-icon i formatı için .preview-icon'u dene
                            var containerSelector = mainSelector.replace(' i', '');
                            $preview = $(containerSelector).find('i');
                            console.log('Container ile deneme:', containerSelector, $preview.length, 'i etiketi bulundu');
                        }
                    }

                    // Element var mı kontrol et
                    if ($preview.length === 0) {
                        console.error('Preview element bulunamadı:', previewSelector, 'Lütfen HTML yapınızı kontrol edin.');
                        return this;
                    }
                    
                    // Preview i etiketini güncelle - Tüm sınıfları kaldır
                    $preview.attr('class', ''); // Bütün sınıfları temizle
                    
                    // Sadece ikon sınıfını ekle
                    $preview.addClass(iconClass);
                    
                    console.log('Icon güncellendi:', iconClass);
                } catch(e) {
                    console.error('Icon güncelleme hatası:', e);
                }
            }
            
            return this;
        }
    };

    // jQuery plugin tanımı
    $.fn.iconpicker = function(options) {
        return this.each(function() {
            var $this = $(this);
            var picker = $this.data('iconpicker');
            
            if (!picker) {
                picker = new IconPicker(this, options);
                $this.data('iconpicker', picker);
            } else if (typeof options === 'string') {
                    picker[options]();
            }
        });
    };

    // Document ready olduğunda icon-picker sınıflı inputları otomatik başlat
    $(function() {
        $('.icon-picker').each(function() {
            var $input = $(this);
            if (!$input.data('iconpicker')) {
                var options = {
                    inlineMode: true
                };
                
                if ($input.closest('.modal').length > 0) {
                    options.modalMode = true;
                    options.zIndex = 1056;
                }
                
                $input.iconpicker(options);
            }
        });
        
        $(document).on('shown.bs.modal', '.modal', function() {
            var $modal = $(this);
            $modal.find('.icon-picker').each(function() {
                var $input = $(this);
                if (!$input.data('iconpicker')) {
                    $input.iconpicker({
                        inlineMode: true,
                        modalMode: true,
                        zIndex: 1056
                    });
                }
            });
        });
    });

})(jQuery); 
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
            
            // Aktif kategoriyi ayarla
            this.activeCategory = 'all';
            
            // Benzersiz ID ver
            this.uniqueId = 'iconpicker_' + Math.floor(Math.random() * 10000);
            this.element.attr('data-iconpicker-id', this.uniqueId);
            
            // İkon değeri eğer verilmişse input'a ata
            if (this.element.is('input')) {
                // Input'un mevcut değerini al (veritabanından gelebilir)
                var existingValue = this.element.val();
                
                // Eğer input'ta değer yoksa, varsayılan ikonu kullan
                if (!existingValue && this.settings.selectedIcon) {
                    this.element.val(this.settings.selectedIcon);
                } else if (existingValue) {
                    // Input'ta değer varsa, selectedIcon ayarını güncelle
                    this.settings.selectedIcon = existingValue;
                }

                // Kullanılacak ikon sınıfını belirle - değer yoksa selectedIcon kullan
                var iconClass = this.element.val() || this.settings.selectedIcon;
                
                // Eğer ikon sınıfından kategoriyi belirle
                if (iconClass) {
                    var prefix = this._getPrefixFromIconClass(iconClass);
                    var category = this._getCategoryFromPrefix(prefix);
                    
                    if (category) {
                        this.settings.defaultCategory = category;
                    }
                }
                
                // Otomatik preview-icon oluşturma veya var olan preview'ı kullanma
                if (!this.settings.iconPreview) {
                    // Input etrafına wrapper ekle (eğer zaten yoksa)
                    if (!this.element.parent().hasClass('input-group')) {
                        this.element.wrap('<div class="input-group"></div>');
                    }
                    
                    // Preview iconu ekle - Temiz div ve i yapısı
                    var previewDiv = $('<div class="preview-icon"></div>');
                    var iconElement = $('<i></i>').addClass(iconClass);
                    previewDiv.append(iconElement);
                    
                    // Preview elementi input'un önüne ekle
                    this.element.before(previewDiv);
                    
                    // Preview elementi için ayarı güncelle
                    this.settings.iconPreview = iconElement;
                } else {
                    // Preview elementi zaten ayarlanmış, kontrol et ve güncelle
                    var $preview;
                    
                    if (typeof this.settings.iconPreview === 'string') {
                        $preview = $(this.settings.iconPreview);
                        if ($preview.length === 0) {
                            console.warn('Belirtilen iconPreview elementi bulunamadı. Otomatik oluşturuluyor.');
                            
                            // Otomatik oluştur
                            var previewDiv = $('<div class="preview-icon"></div>');
                            var iconElement = $('<i></i>').addClass(iconClass);
                            previewDiv.append(iconElement);
                            this.element.before(previewDiv);
                            
                            this.settings.iconPreview = iconElement;
                        } else {
                            // Mevcut preview elementini güncelle
                            $preview.attr('class', '').addClass(iconClass);
                        }
                    }
                }
                
                // Element bir modal içinde ise modalMode ayarını aktifleştir
                if (this.element.closest('.modal').length > 0 && !this.settings.modalMode) {
                    this.settings.modalMode = true;
                    this.settings.zIndex = 1056;
                }
            }
            
            // İkon önizleme elementini ayarla (ek güvenlik kontrolleri)
            if (this.settings.iconPreview) {
                var previewElem = $(this.settings.iconPreview);
                var inputValue = this.element.val();
                var iconClass = inputValue || this.settings.selectedIcon;
                
                // Sınıfları temizle ve ikonu ayarla
                if (previewElem.length > 0) {
                    previewElem.attr('class', '');
                    previewElem.addClass(iconClass);
                }
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
                
                // Input değişiklik olayı
                this.element.on('input change keyup', function() {
                    var newValue = $(this).val();
                    if (newValue) {
                        // selectedIcon ayarını güncelle
                        self.settings.selectedIcon = newValue;
                        
                        // Preview'i güncelle
                        self._updatePreviewIcon();
                    } else {
                        // Input boşsa varsayılan selectedIcon değerini kullan
                        $(this).val(self.settings.selectedIcon);
                        self._updatePreviewIcon();
                    }
                });
                
                // Sayfa yüklendiğinde önizleme ikonunu güncelle
                // Not: Bu bizim son çalıştırma noktamız, yani init'ten sonra bile çalışacak
                this._updatePreviewIcon();
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
        
        // İkon sınıfından prefix almak için yardımcı fonksiyon
        _getPrefixFromIconClass: function(iconClass) {
            if (!iconClass) return null;
            
            // İkon sınıfını analiz et
            var parts = iconClass.split(' ');
            
            // Font Awesome formatındaysa ilk parça prefixdir (fas, far, fab, vb.)
            if (parts.length > 0) {
                var prefix = parts[0];
                
                // Sadece bilinen prefixleri kabul et
                if (['fas', 'far', 'fab', 'fal', 'fad'].indexOf(prefix) > -1) {
                    return prefix;
                }
            }
            
            return null;
        },
        
        // Prefix'ten kategori belirle
        _getCategoryFromPrefix: function(prefix) {
            var prefixMap = {
                'fas': 'solid',
                'far': 'regular',
                'fab': 'brands',
                'fal': 'light',
                'fad': 'duotone'
            };
            
            return prefix ? prefixMap[prefix] : null;
        },
        
        // Dropdown oluştur
        _createDropdown: function() {
            var self = this;
            
            // Temel yapıyı oluştur
            this.element.addClass('iconpicker-dropdown-container');
            
            // Önizleme grubunu oluştur
            var previewGroup = $('<div class="iconpicker-preview-group input-group"></div>');
            
            // Önizleme ikonu div'i
            var previewDiv = $('<div class="iconpicker-preview" id="' + this.element.attr('id') + '-preview"></div>');
            
            // Önizleme ikonu 
            var previewIcon = $('<i class="iconpicker-preview-icon"></i>');
            if (this.settings.defaultIcon) {
                previewIcon.addClass(this.settings.defaultIcon);
                this.selectedIcon = this.settings.defaultIcon;
            }
            
            previewDiv.append(previewIcon);
            previewGroup.append(previewDiv);
            
            // Seçim butonu
            var selectButton = $('<button type="button" class="iconpicker-select-button btn btn-outline-secondary">' + 
                            '<i class="fas fa-chevron-down"></i></button>');
            
            // Input grup oluştur ve butonları ekle
            var inputGroupAppend = $('<div class="input-group-append"></div>').append(selectButton);
            previewGroup.append(inputGroupAppend);
            
            // Gizli input için ikon adını sakla
            var iconNameInput = $('<input type="hidden" name="' + (this.element.attr('data-name') || 'selected_icon') + 
                                '" id="' + this.element.attr('id') + '-input" value="' + (this.settings.defaultIcon || '') + '">');
            
            // Element yapısını oluştur
            this.element.append(previewGroup);
            this.element.append(iconNameInput);
            
            // Dropdown oluştur
            this.dropdown = $('<div class="iconpicker-dropdown"></div>');
            
            // Dropdown içeriği
            var dropdownContent = $('<div class="iconpicker-dropdown-content"></div>');
            
            // Arama alanı
            if (this.settings.search) {
                var searchContainer = $('<div class="iconpicker-search"></div>');
                this.searchInput = $('<input type="text" class="iconpicker-search-input form-control" placeholder="İkon ara...">');
                searchContainer.append(this.searchInput);
                dropdownContent.append(searchContainer);
                
                // Arama olayı
                this.searchInput.on('input', function() {
                    var query = $(this).val().trim();
                    if (query === '') {
                        self._selectCategory(self.activeCategory);
                    } else {
                        self._performSearch(query);
                    }
                });
            }
            
            // Kategoriler konteynerini oluştur
            var categoriesContainer = this._createCategoryButtons();
            dropdownContent.append(categoriesContainer);
                
            // İkon konteynerini oluştur
            this.iconsContainer = $('<div class="iconpicker-icons-container"></div>');
            dropdownContent.append(this.iconsContainer);
            
            // Dropdown'ı sayfaya ekle
            this.dropdown.append(dropdownContent);
            $('body').append(this.dropdown);
            
            // Dropdown'ı gizle/göster düğmesi için olay
            selectButton.on('click', function(e) {
                e.stopPropagation();
                self.toggleDropdown();
            });
            
            // Dropdown dışına tıklanınca kapatsın
            $(document).on('click', function(e) {
                if (!$(e.target).closest(self.dropdown).length && 
                    !$(e.target).closest(self.element).length) {
                    self.hideDropdown();
                }
            });
            
            // Default kategoriyi yükle
            this._loadCategoryIcons('all');
            
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
            console.log('İkon veri seti yüklenemedi!');
            
            // Hata bilgisi ekle
            this.iconsContainer.html('<div class="alert alert-warning">İkon seti bulunamadı!</div>');
            
            return false;
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
            if (this.dropdown.hasClass('show')) {
                return this;
            }
            
            var iconClass = this.element.val() || this.settings.selectedIcon;
            
            // Eğer ikon sınıfında prefix varsa, kategorisini belirle
            if (iconClass) {
                var prefix = this._getPrefixFromIconClass(iconClass);
                var category = this._getCategoryFromPrefix(prefix);
                
                // Varsayılan kategoriyi güncelle
                if (category && this.settings.categories[category]) {
                    this.settings.defaultCategory = category;
                    
                    // Kategorileri güncelle
                    this.dropdown.find('.iconpicker-category').removeClass('active');
                    this.dropdown.find('.iconpicker-category[data-category="' + category + '"]').addClass('active');
                    
                    // Kategori ikonlarını yükle
                    this._loadCategoryIcons(category);
                }
            }
            
            // Dropdown pozisyonunu ayarla
            this._positionDropdown();
            this.dropdown.addClass('show');
            
            // Modal içinde kullanılıyorsa ek z-index ayarı
            if (this.settings.modalMode) {
                this.dropdown.addClass('iconpicker-modal-mode');
                
                // Modal içinde input olaylarını özel olarak yönet
                this._setupModalSearchInput();
            }
            
            // Dropdown gösterildi olayını tetikle
            this.element.trigger('shown.iconpicker', [this]);
            
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
                var activeIconClass = self.element.val() || self.settings.selectedIcon;
                var activeIconFound = false;
                var activeIconIndex = -1;
                var faIcon = '';
                
                // Önce fa-* kısmını çıkartarak ikon adını alalım
                if (activeIconClass) {
                    var activeClass = activeIconClass.split(' ');
                    for (var k = 0; k < activeClass.length; k++) {
                        if (activeClass[k].startsWith('fa-')) {
                            faIcon = activeClass[k].replace('fa-', '');
                            break;
                        }
                    }
                }
                
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
                    
                    // Aktif ikonu kontrol et (seçili ikonu işaretle)
                    var isActive = false;
                    
                    // İkon isim kontrolü - hem isim hem prefix kontrolü yap
                    if (activeIconClass) {
                        // Prefix kontrolü
                        var iconPrefix = self._getPrefixFromIconClass(activeIconClass);
                        var currentPrefix = self._getPrefixFromIconClass(iconClass);
                        
                        // İkon adı kontrolü
                        if (faIcon && icon === faIcon && iconPrefix === currentPrefix) {
                            isActive = true;
                            activeIconFound = true;
                            activeIconIndex = i;
                        }
                        
                        // Tam eşleşme kontrolü
                        if (!isActive && activeIconClass === iconClass) {
                            isActive = true;
                            activeIconFound = true;
                            activeIconIndex = i;
                        }
                    }
                    
                    // Seçili sınıfını ekle
                    if (isActive) {
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
                
                // Aktif ikona kaydır
                if (activeIconFound && activeIconIndex > -1) {
                    // Hesapla: Her satırda 5 ikon var, her ikon 3rem (48px) + 0.5rem (8px) boşluk
                    // İkonun hangi satırda olduğunu bul
                    var rowIndex = Math.floor(activeIconIndex / 5);
                    
                    // Yükseklik hesapla (ikon yüksekliği + boşluk)
                    var scrollTo = rowIndex * (48 + 8);
                    
                    // Kaydır (biraz geciktirerek DOM'un yüklenmesini bekle)
                    setTimeout(function() {
                        self.iconsContainer.scrollTop(scrollTo);
                    }, 100);
                }
                
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
        _selectIcon: function(iconClass) {
            var self = this;
            
            // İkon sınıfını ayarla
            this.settings.selectedIcon = iconClass;
            
            // İkon seçildi olayını tetikle
            this.element.trigger('iconpickerSelect', [iconClass]);
            
            // İnline mode için işlemler
            if (this.settings.inlineMode) {
                try {
                    // Dropdown var mı kontrol et - inline modda farklı bir referans kullanabilir
                    var $container = this.element.next('.iconpicker-inline-container');
                    
                    if ($container.length > 0) {
                // Seçilen ikonu göster ve bütün ikonları seçili stilinden çıkart
                        $container.find('.iconpicker-icon').removeClass('selected');
                        
                        // İkon sınıfını parçalara ayır
                        var iconPrefix = '';
                        var iconName = '';
                        
                        if (iconClass) {
                            var parts = iconClass.split(' ');
                            if (parts.length >= 2) {
                                iconPrefix = parts[0]; // fas, far, fab
                                
                                // fa- ile başlayan parçayı bul
                                for (var i = 1; i < parts.length; i++) {
                                    if (parts[i].startsWith('fa-')) {
                                        iconName = parts[i].substring(3); // fa- kısmını çıkar
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // Seçilen ikonu işaretle 
                        if (iconPrefix && iconName) {
                            $container.find('.iconpicker-icon[data-icon="' + iconClass + '"]').addClass('selected');
                }
                
                // Değeri input'a ata
                this.element.val(iconClass);
                
                // Eğer bir callback tanımlanmışsa çağır
                if (typeof this.settings.onSelect === 'function') {
                    this.settings.onSelect.call(this, iconClass);
                }
                
                // Seçilen ikon için önizleme göster
                if (this.settings.iconPreview && $(this.settings.iconPreview).length > 0) {
                    // Preview elementini temizle ve yeni ikonu ata
                    $(this.settings.iconPreview).attr('class', '').addClass(iconClass);
                        }
                    }
                } catch (error) {
                    console.error('İkon seçimi sırasında hata:', error);
                }
                
                return this;
            }
            
            // Normal mode (dropdown) için işlemler
            // İkonu dropdown içinde göster
            if (this.element.is('input')) {
                // Input değerini ayarla
                this.element.val(iconClass);
                
                // Input değer değişikliği olayını tetikle
                this.element.trigger('change');
                
                // Önizleme görüntüsünü güncelle
                this._updatePreviewIcon();
                
                // Dropdown butonunu güncelle
                if (this.dropdownButton) {
                    var buttonIcon = this.dropdownButton.find('i');
                    if (buttonIcon.length > 0) {
                        buttonIcon.attr('class', '').addClass(iconClass);
                    }
                }
            }
            
            // Dropdown'u gizle - Eğer dropdown tanımlıysa
            if (this.dropdown) {
            this.hideDropdown();
            }
            
            // Eğer bir callback tanımlanmışsa çağır
            if (typeof this.settings.onSelect === 'function') {
                this.settings.onSelect.call(this, iconClass);
            }
            
            return this;
        },
        
        // Inline Mode için özel init metodu
        _initInlineMode: function() {
            var self = this;
            
            // Element ID'sini al
            var inputId = this.element.attr('id') || 'iconpicker-input-' + Math.floor(Math.random() * 1000);
            
            // İnput'u salt okunur yapma - kullanıcı düzenleyebilmeli
            // this.element.attr('readonly', true).addClass('iconpicker-inline-input');
            this.element.addClass('iconpicker-inline-input');
            
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
        _loadCategoryIconsInline: function(category) {
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
                try {
                var categoryData = self.settings.categories[category];
                var prefix = categoryData.prefix;
                
                // İlgili kategori için ikon verilerini kontrol et
                if (!self.iconData || !self.iconData[category] || !Array.isArray(self.iconData[category])) {
                    self.iconsContainer.html('<div class="alert alert-warning">Bu kategori için ikonlar bulunamadı.</div>');
                    return;
                }
                
                var icons = self.iconData[category];
                var activeIconClass = self.element.val() || self.settings.selectedIcon;
                var activeIconFound = false;
                var activeIconIndex = -1;
                var faIcon = '';
                
                // Önce fa-* kısmını çıkartarak ikon adını alalım
                if (activeIconClass) {
                    var activeClass = activeIconClass.split(' ');
                    for (var k = 0; k < activeClass.length; k++) {
                        if (activeClass[k].startsWith('fa-')) {
                            faIcon = activeClass[k].replace('fa-', '');
                            break;
                        }
                    }
                }
                
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
                    
                    // Aktif ikonu kontrol et (seçili ikonu işaretle)
                    var isActive = false;
                    
                    // İkon isim kontrolü - hem isim hem prefix kontrolü yap
                    if (activeIconClass) {
                        // Prefix kontrolü
                        var iconPrefix = self._getPrefixFromIconClass(activeIconClass);
                        var currentPrefix = self._getPrefixFromIconClass(iconClass);
                        
                        // İkon adı kontrolü
                        if (faIcon && icon === faIcon && iconPrefix === currentPrefix) {
                            isActive = true;
                            activeIconFound = true;
                            activeIconIndex = i;
                        }
                        
                        // Tam eşleşme kontrolü
                        if (!isActive && activeIconClass === iconClass) {
                            isActive = true;
                            activeIconFound = true;
                            activeIconIndex = i;
                        }
                    }
                    
                    // Seçili sınıfını ekle
                    if (isActive) {
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
                            
                                // İkon sınıfını al
                                var selectedIconClass = $icon.data('icon');
                                
                                // İkon sınıfı boş değilse
                                if (selectedIconClass) {
                                    // Ikon değerini güncelle - doğrudan inline modda çalışan setIcon metodunu kullan
                                    self.setIcon(selectedIconClass);
                                }
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
                
                // Aktif ikona kaydır
                if (activeIconFound && activeIconIndex > -1) {
                    // Hesapla: Her satırda 5 ikon var, her ikon 3rem (48px) + 0.5rem (8px) boşluk
                    // İkonun hangi satırda olduğunu bul
                    var rowIndex = Math.floor(activeIconIndex / 5);
                    
                    // Yükseklik hesapla (ikon yüksekliği + boşluk)
                    var scrollTo = rowIndex * (48 + 8);
                    
                    // Kaydır (biraz geciktirerek DOM'un yüklenmesini bekle)
                    setTimeout(function() {
                        self.iconsContainer.scrollTop(scrollTo);
                    }, 100);
                }
                } catch (error) {
                    console.error('İkonları yüklerken hata:', error);
                    self.iconsContainer.html('<div class="alert alert-danger">İkonlar yüklenirken bir hata oluştu.</div>');
                }
            }, 150);
            
            return this;
        },
        
        // Direkt olarak previewı güncelle
        _updatePreviewIcon: function() {
            var self = this;
            
            // Sayfa yüklendiğinde önizleme ikonunu güncelle
            var inputValue = this.element.val();
            var iconClass = inputValue || this.settings.selectedIcon;
            
            // Preview elementi kontrol et
            if (this.settings.iconPreview) {
                var $preview = $(this.settings.iconPreview);
                
                if ($preview.length > 0) {
                    $preview.attr('class', '').addClass(iconClass);
                } else {
                    // Preview elementi bulunamadıysa, otomatik oluştur
                    var previewDiv = $('<div class="preview-icon"></div>');
                    var iconElement = $('<i></i>').addClass(iconClass);
                    previewDiv.append(iconElement);
                    this.element.before(previewDiv);
                    this.settings.iconPreview = iconElement;
                }
            }
            
            return this;
        },
        
        // Program aracılığıyla ikonu değiştirmek için kullanılabilecek public metod
        setIcon: function(iconClass) {
            try {
                // İkon sınıfını kontrol et
                if (!iconClass || typeof iconClass !== 'string') {
                    console.error('Geçersiz ikon sınıfı:', iconClass);
                    return this;
                }
                
                // Input değerini değiştir
                this.element.val(iconClass);
                
                // selectedIcon ayarını güncelle
                this.settings.selectedIcon = iconClass;
                
                // Preview ikonunu güncelle
                this._updatePreviewIcon();
                
                // İkon kategorisini belirle
                var prefix = this._getPrefixFromIconClass(iconClass);
                var category = this._getCategoryFromPrefix(prefix);
                
                // Eğer inline modda ise container içindeki ikonları güncelle
                if (this.settings.inlineMode) {
                    this._updateSelectedIconInInlineMode(iconClass, category);
                } else if (this.dropdown) {
                    // Normal mod ise ve dropdown açıksa ikonu seç ve scroll yap
                    if (this.dropdown.hasClass('show')) {
                        this._updateSelectedIconInDropdown(iconClass, category);
                    }
                }
                
                // Change olayını tetikle
                this.element.trigger('change');
                
                // Callback'i çağır (eğer varsa)
                if (typeof this.settings.onSelect === 'function') {
                    this.settings.onSelect.call(this, iconClass);
                }
                
                return this;
            } catch (error) {
                console.error('İkon güncellenirken hata:', error);
                return this;
            }
        },
        
        // Inline modda seçili ikonu güncelle ve scroll yap 
        _updateSelectedIconInInlineMode: function(iconClass, category) {
            var self = this;
            var $container = this.element.next('.iconpicker-inline-container');
            
            if ($container.length > 0) {
                // Tüm ikonlardan seçim kaldır
                $container.find('.iconpicker-icon').removeClass('selected');
                
                // Eğer geçerli bir kategori varsa ve o kategoride değilsek, kategoriyi değiştir
                if (category && $container.find('.iconpicker-category').length > 0) {
                    var $categoryBtn = $container.find('.iconpicker-category[data-category="' + category + '"]');
                    
                    if ($categoryBtn.length > 0 && !$categoryBtn.hasClass('active')) {
                        // Önce tüm kategorileri pasif yap
                        $container.find('.iconpicker-category').removeClass('active');
                        // Sonra ilgili kategoriyi aktif yap
                        $categoryBtn.addClass('active');
                        
                        // Kategoriyi yükle (bu, ilgili kategori ikonlarını gösterecektir)
                        this._loadCategoryIconsInline(category);
                        
                        // İkonlar yüklendiğinde seçili ikonu işaretle ve scroll yap
                        setTimeout(function() {
                            // Eşleşen ikonu bul ve seç
                            var $icon = $container.find('.iconpicker-icon[data-icon="' + iconClass + '"]');
                            if ($icon.length > 0) {
                                $icon.addClass('selected');
                                
                                // İkona scroll yap - düzgün görünmesi için offset hesaplaması
                                self._scrollToIcon($icon, self.iconsContainer);
                            }
                        }, 350); // Kategorinin yüklenmesi için biraz daha bekle
                        
                        return;
                    }
                }
                
                // Eğer kategori değişmediyse sadece ikonu seç ve scroll yap
                var $icon = $container.find('.iconpicker-icon[data-icon="' + iconClass + '"]');
                if ($icon.length > 0) {
                    $icon.addClass('selected');
                    
                    // İkona scroll yap - düzgün görünmesi için offset hesaplaması
                    this._scrollToIcon($icon, this.iconsContainer);
                }
                
                // Footer'daki ikon bilgisini güncelle (eğer varsa)
                var $footer = $container.find('.iconpicker-footer');
                if ($footer.length > 0) {
                    var $selectedIconInfo = $footer.find('.iconpicker-selected-icon');
                    if ($selectedIconInfo.length > 0) {
                        $selectedIconInfo.html('<i class="' + iconClass + '"></i> <span>' + iconClass + '</span>');
                    }
                }
            }
        },
        
        // Normal dropdown modunda seçili ikonu güncelle ve scroll yap
        _updateSelectedIconInDropdown: function(iconClass, category) {
            var self = this;
            
            // Eğer dropdown açık değilse, işlemi iptal et
            if (!this.dropdown.hasClass('show')) {
                return;
            }
            
            // Eğer geçerli bir kategori varsa ve farklı bir kategorideyse, kategoriyi değiştir
            if (category && this.activeCategory !== category && 
                this.dropdown.find('.iconpicker-category-button[data-category="' + category + '"]').length > 0) {
                
                // Kategori butonuna tıkla
                this.dropdown.find('.iconpicker-category-button[data-category="' + category + '"]').click();
                
                // İkonlar yüklendiğinde seçili ikonu işaretle ve scroll yap
                setTimeout(function() {
                    // Tüm ikonlardan seçimi kaldır
                    self.dropdown.find('.iconpicker-icon').removeClass('selected');
                    
                    // Eşleşen ikonu bul ve seç
                    var $icon = self.dropdown.find('.iconpicker-icon[data-icon="' + iconClass + '"]');
                    if ($icon.length === 0) {
                        // Data-icon attribute'u yoksa, i elementi içindeki class ile karşılaştır
                        $icon = self.dropdown.find('.iconpicker-icon').filter(function() {
                            var iconI = $(this).find('i').attr('class');
                            return iconI === iconClass;
                        });
                    }
                    
                    if ($icon.length > 0) {
                        $icon.addClass('selected');
                        
                        // İkona scroll yap - düzgün görünmesi için offset hesaplaması
                        self._scrollToIcon($icon, self.iconsContainer);
                    }
                }, 350); // Kategorinin yüklenmesi için biraz daha bekle
                
                return;
            }
            
            // Eğer kategori değişmediyse veya kategori yoksa, sadece ikonu seç ve scroll yap
            this.dropdown.find('.iconpicker-icon').removeClass('selected');
            
            // Eşleşen ikonu bul ve seç
            var $icon = this.dropdown.find('.iconpicker-icon[data-icon="' + iconClass + '"]');
            if ($icon.length === 0) {
                // Data-icon attribute'u yoksa, i elementi içindeki class ile karşılaştır
                $icon = this.dropdown.find('.iconpicker-icon').filter(function() {
                    var iconI = $(this).find('i').attr('class');
                    return iconI === iconClass;
                });
            }
            
            if ($icon.length > 0) {
                $icon.addClass('selected');
                
                // İkona scroll yap - düzgün görünmesi için offset hesaplaması 
                this._scrollToIcon($icon, this.iconsContainer);
            }
        },
        
        // İkona scroll yapmak için ortak fonksiyon
        _scrollToIcon: function($icon, $container) {
            if (!$icon || !$icon.length || !$container || !$container.length) return;
            
            try {
                // Container içindeki mevcut scroll pozisyonu
                var currentScroll = $container.scrollTop();
                
                // İkonun container içindeki pozisyonu (container'ın scroll pozisyonunu dikkate alarak)
                var iconOffset = $icon.offset().top;
                var containerOffset = $container.offset().top;
                
                // İkonun container'ın üst kısmına tam olarak hizalanması için gerekli scroll mesafesi
                var newScrollPosition = currentScroll + (iconOffset - containerOffset);
                
                // Container içinde scroll yap
                $container.animate({
                    scrollTop: newScrollPosition
                }, 300);
                
                // Event'i burada durdur - sayfa scrollunu engelle
                return false;
            } catch (e) {
                console.error("Scroll hatası:", e);
            }
        },
        
        // İkon araması için fonksiyon
        _searchIcons: function(searchTerm, category) {
            var self = this;
            var searchResults = [];
            var icons = [];
            
            // Belirli bir kategoriye göre arama yapma
            if (category && category !== 'all') {
                icons = this._getIconsForCategory(category);
            } else {
                icons = this.settings.icons;
            }
            
            // Küçük harfe dönüştür
            searchTerm = searchTerm.toLowerCase();
            
            // İkonları filtrele
            $.each(icons, function(i, icon) {
                // İkon adında arama yap
                if (icon.toLowerCase().indexOf(searchTerm) !== -1) {
                    searchResults.push(icon);
                }
            });
            
            return searchResults;
        },
        
        _performSearch: function(searchTerm) {
            var self = this;
            searchTerm = searchTerm.toLowerCase();
            
            // Kategorileri gizle
            this.dropdown.find('.iconpicker-category').hide();
            
            // Aktif ikon listesini temizle
            this.activeIconsList = [];
            
            // Tüm kategorilerde ara
            var foundIcons = [];
            var iconCategories = {};
            
            // Her kategoride ayrı ayrı ara ve bulunan sonuçları kategori bazında sakla
            $.each(this.settings.categories, function(catId, category) {
                var prefix = category.prefix;
                var categoryIcons = self.iconData[catId] || [];
                
                categoryIcons.forEach(function(icon) {
                    // İkon sınıfını oluştur
                    var iconClass = prefix + ' fa-' + icon;
                    
                    // İkonun adında veya sınıfında arama yap
                    if (icon.toLowerCase().indexOf(searchTerm) !== -1 || 
                        iconClass.toLowerCase().indexOf(searchTerm) !== -1) {
                        foundIcons.push(iconClass);
                        
                        // Kategori bazında grupla
                        if (!iconCategories[catId]) {
                            iconCategories[catId] = [];
                        }
                        iconCategories[catId].push(iconClass);
                    }
                });
            });
            
            // İkon konteynırını temizle
            this.iconsContainer.empty();
            
            // Bulunan ikonları göster
            if (foundIcons.length > 0) {
                // Arama sonuçları kategorisini oluştur
                var searchResultsWrapper = $('<div class="iconpicker-search-results"></div>');
                searchResultsWrapper.html('<h6 class="iconpicker-category-title">' + foundIcons.length + ' sonuç bulundu</h6>');
                this.iconsContainer.append(searchResultsWrapper);
                
                // Arama sonuçlarını kategorilere göre grupla
                var iconsWrapper = $('<div class="iconpicker-icons"></div>');
                
                // Kategorilere göre sırala
                $.each(iconCategories, function(catId, categoryIcons) {
                    var categoryTitle = self.settings.categories[catId].title;
                    var categorySection = $('<div class="iconpicker-category-section"></div>');
                    categorySection.append('<h6 class="iconpicker-category-title">' + categoryTitle + ' (' + categoryIcons.length + ')</h6>');
                    
                    var categoryIconsWrapper = $('<div class="iconpicker-category-icons"></div>');
                    
                    // Kategori ikonlarını ekle
                    $.each(categoryIcons, function(i, iconClass) {
                        var iconItem = $('<div class="iconpicker-icon" data-icon="' + iconClass + '" title="' + iconClass + '"></div>');
                        var iconElement = $('<i></i>').attr('class', '').addClass(iconClass);
                        iconItem.append(iconElement);
                        
                        // İkon tıklama olayı
                        iconItem.on('click', function() {
                            iconsWrapper.find('.iconpicker-icon').removeClass('selected');
                            $(this).addClass('selected');
                            var iconClass = $(this).find('i').attr('class');
                            self._selectIcon(iconClass);
                            
                            // Seçimden sonra dropdown'ı gizle (normal modda)
                            if (self.settings.hideOnSelect && !self.settings.inlineMode) {
                                self.hideDropdown();
                            }
                        });
                        
                        categoryIconsWrapper.append(iconItem);
                    });
                    
                    categorySection.append(categoryIconsWrapper);
                    iconsWrapper.append(categorySection);
                });
                
                this.iconsContainer.append(iconsWrapper);
            } else {
                // Sonuç bulunamadı mesajı göster
                var noResultsMessage = $('<div class="iconpicker-no-results"></div>');
                noResultsMessage.html('<p>' + this.settings.noResultsText + '</p>');
                this.iconsContainer.append(noResultsMessage);
            }
            
            return this;
        },
        
        _loadAllIcons: function() {
            var self = this;
            
            // Yükleniyor göster
            this.iconsContainer.html('<div class="iconpicker-loading"><div class="iconpicker-loading-spinner"></div> Yükleniyor...</div>');
            
            setTimeout(function() {
                // Tüm kategorilerdeki ikonları birleştir
                var allIcons = [];
                var activeIconClass = self.element.val() || self.settings.selectedIcon;
                var activeIconFound = false;
                var activeIconIndex = -1;
                
                // Her kategoriden ikonları topla
                $.each(self.settings.categories, function(catId, category) {
                    var prefix = category.prefix;
                    var categoryIcons = self.iconData[catId] || [];
                    
                    categoryIcons.forEach(function(icon) {
                        // İkon sınıfını oluştur
                        var iconClass = prefix + ' fa-' + icon;
                        allIcons.push({
                            iconClass: iconClass,
                            category: catId
                        });
                        
                        // Aktif ikon kontrolü
                        if (activeIconClass && activeIconClass === iconClass) {
                            activeIconFound = true;
                            activeIconIndex = allIcons.length - 1;
                        }
                    });
                });
                
                // İkonları göster
                var iconsWrapper = $('<div class="iconpicker-icons"></div>');
                
                // Kategori başlığını oluştur
                var categoryTitle = $('<h6 class="iconpicker-category-title">Tüm İkonlar (' + allIcons.length + ')</h6>');
                self.iconsContainer.html('');
                self.iconsContainer.append(categoryTitle);
                
                // İkonları ekle
                $.each(allIcons, function(i, iconData) {
                    var iconClass = iconData.iconClass;
                    var iconItem = $('<div class="iconpicker-icon" data-icon="' + iconClass + '" title="' + iconClass + '"></div>');
                    var iconElement = $('<i></i>').attr('class', '').addClass(iconClass);
                    iconItem.append(iconElement);
                    
                    // Aktif ikonu işaretle
                    if (activeIconClass && activeIconClass === iconClass) {
                        iconItem.addClass('selected');
                    }
                    
                    // İkon tıklama olayı
                    iconItem.on('click', function() {
                        iconsWrapper.find('.iconpicker-icon').removeClass('selected');
                        $(this).addClass('selected');
                        var iconClass = $(this).find('i').attr('class');
                        self._selectIcon(iconClass);
                        
                        // Seçimden sonra dropdown'ı gizle (normal modda)
                        if (self.settings.hideOnSelect && !self.settings.inlineMode) {
                            self.hideDropdown();
                        }
                    });
                    
                    iconsWrapper.append(iconItem);
                });
                
                self.iconsContainer.append(iconsWrapper);
                
                // Aktif ikona kaydır
                if (activeIconFound && activeIconIndex > -1) {
                    var rowIndex = Math.floor(activeIconIndex / 5);
                    var scrollTo = rowIndex * (48 + 8);
                    setTimeout(function() {
                        self.iconsContainer.scrollTop(scrollTo);
                    }, 100);
                }
            }, 150);
            
            return this;
        },
        _createSearchInput: function() {
            var self = this;
            var searchWrapper = $('<div class="iconpicker-search-wrapper"></div>');
            var searchInput = $('<input type="text" class="form-control iconpicker-search" placeholder="İkon ara...">');
            
            searchWrapper.append(searchInput);
            this.dropdown.find('.iconpicker-categories').before(searchWrapper);
            
            // Arama alanına her karakter girişinde ara
            searchInput.on('keyup', function() {
                var searchTerm = $(this).val();
                clearTimeout(self.searchTimeout);
                
                self.searchTimeout = setTimeout(function() {
                    // Minimum 2 karakter girildiğinde aramayı başlat
                    if (searchTerm.length >= 2) {
                        self._performSearch(searchTerm);
                    } else if (searchTerm.length === 0) {
                        // Arama alanı boşsa tüm kategorileri göster ve "sonuç bulunamadı" mesajını kaldır
                        self.dropdown.find('.iconpicker-category').show();
                        self.dropdown.find('.iconpicker-no-results').remove();
                        self.dropdown.find('.iconpicker-category[data-category="search-results"]').remove();
                        
                        // Aktif kategoriyi göster
                        if (self.activeCategory === 'all') {
                            self._loadAllIcons();
                        } else {
                            self._loadCategoryIcons(self.activeCategory);
                        }
                    }
                }, 300);
            });
            
            return this;
        },
        _loadCategories: function() {
            var self = this;
            var categoryContainer = this.dropdown.find('.iconpicker-categories');
            categoryContainer.empty();
            
            // Kategorileri oluştur
            var firstVisibleCategory = null;
            
            $.each(this.settings.categories, function(catId, category) {
                // Kategorideki ikonları kontrol et
                var categoryIcons = self._getIconsForCategory(catId);
                
                // Eğer kategoride ikon yoksa, kategoriyi oluşturma
                if (categoryIcons.length === 0 && catId !== 'all') {
                    return;
                }
                
                // Kategori HTML'ini oluştur
                var categoryHtml = self.settings.templates.iconCategory
                    .replace('{category}', catId)
                    .replace('{title}', category.title);
                
                var categoryElem = $(categoryHtml);
                categoryContainer.append(categoryElem);
                
                // İlk görünür kategoriyi kaydet
                if (!firstVisibleCategory) {
                    firstVisibleCategory = catId;
                }
                
                // Kategori tıklama olayı
                categoryElem.on('click', function() {
                    categoryContainer.find('.iconpicker-category-button').removeClass('active');
                    $(this).addClass('active');
                    var category = $(this).data('category');
                    
                    // Dropdown modundaysa kategori ikonlarını yükle
                    if (self.settings.mode === 'dropdown') {
                        self._loadCategoryIcons(category);
                    } else {
                        // Inline modunda ise kategori ikonlarını inline olarak yükle
                        self._loadCategoryIconsInline(category);
                    }
                });
            });
            
            // Eğer varsayılan kategori gösterilmiyorsa, ilk görünür kategoriyi etkinleştir
            var defaultCategoryToShow = firstVisibleCategory;
            if (this.settings.defaultCategory && 
                categoryContainer.find('[data-category="' + this.settings.defaultCategory + '"]').length) {
                defaultCategoryToShow = this.settings.defaultCategory;
            }
            
            // Varsayılan kategoriyi etkinleştir
            if (defaultCategoryToShow) {
                categoryContainer.find('[data-category="' + defaultCategoryToShow + '"]').addClass('active');
                
                // Dropdown modundaysa kategori ikonlarını yükle
                if (this.settings.mode === 'dropdown') {
                    this._loadCategoryIcons(defaultCategoryToShow);
                } else {
                    // Inline modunda ise kategori ikonlarını inline olarak yükle
                    this._loadCategoryIconsInline(defaultCategoryToShow);
                }
            }
        },
        _getIconsForCategory: function(category) {
            var icons = [];
            var prefix = this.settings.categories[category].prefix || '';
            
            // Tüm kategorisi için tüm ikonları döndür
            if (category === 'all') {
                return this.settings.icons;
            }
            
            // Belirli bir kategori için ikonları filtrele
            $.each(this.settings.icons, function(i, icon) {
                if (icon.indexOf(prefix) === 0) {
                    icons.push(icon);
                }
            });
            
            return icons;
        },
        _selectCategory: function(category) {
            var self = this;
            
            // Aktif kategori kaydet
            this.activeCategory = category;
            
            // Kategori butonlarını güncelle
            this.dropdown.find('.iconpicker-category-button').removeClass('active');
            this.dropdown.find('.iconpicker-category-button[data-category="' + category + '"]').addClass('active');
            
            // Yükleniyor göster
            this.iconsContainer.html('<div class="iconpicker-loading"><div class="iconpicker-loading-spinner"></div> Yükleniyor...</div>');
            
            // Biraz gecikmeyle ikonları yükle (animasyon için)
            setTimeout(function() {
                // Tüm arama sonuçları ve kategori içerikleri gizle
                self.dropdown.find('.iconpicker-search-results').hide();
                
                // Arama alanını temizle
                if (self.searchInput) {
                    self.searchInput.val('');
                }
                
                // İkonları göster
                if (category === 'all') {
                    self._loadAllIcons();
                } else {
                    self._loadCategoryIcons(category);
                }
            }, 100);
            
            return this;
        },
        _createCategoryButtons: function() {
            var self = this;
            var categoriesContainer = $('<div class="iconpicker-categories"></div>');
            
            // "Tümü" kategorisi ekle
            var allCategoryButton = $('<button type="button" class="iconpicker-category-button active" data-category="all">Tümü</button>');
            categoriesContainer.append(allCategoryButton);
            
            // Her kategori için buton ekle
            $.each(this.settings.categories, function(catId, category) {
                // Bu kategoride ikon var mı kontrol et
                var categoryIcons = self.iconData[catId] || [];
                
                // Sadece ikon içeren kategorileri göster
                if (categoryIcons.length > 0) {
                    var categoryButton = $('<button type="button" class="iconpicker-category-button" data-category="' + catId + '">' + category.title + '</button>');
                    categoriesContainer.append(categoryButton);
                }
            });
            
            // Kategori tıklama olayları
            categoriesContainer.find('.iconpicker-category-button').on('click', function() {
                var category = $(this).data('category');
                self._selectCategory(category);
            });
            
            return categoriesContainer;
        }
    };

    // jQuery plugin metodunu tanımla
    $.fn.iconpicker = function(options) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data('iconpicker');
            
            if (!data) {
                // Yeni bir iconpicker örneği oluştur
                data = new IconPicker(this, options);
                $this.data('iconpicker', data);
                
                // Plugin init sonrası önizleme ikonunu güncelle
                setTimeout(function() {
                    if (data && typeof data._updatePreviewIcon === 'function') {
                        data._updatePreviewIcon();
                    }
                }, 10);
            } else if (typeof options === 'string') {
                // Eğer seçenek bir string ise, bu bir metod çağrısıdır
                if (data[options]) {
                    return data[options].apply(data, Array.prototype.slice.call(arguments, 1));
                }
            }
        });
    };

    // Document ready olduğunda icon-picker sınıflı inputları otomatik başlat
    $(function() {
        // Önce global DOMContentLoaded event'inin tetiklenmesini bekleyelim
        setTimeout(function() {
        // .icon-picker veya .iconpicker sınıflı tüm inputları otomatik başlat
        $('.icon-picker, .iconpicker').each(function() {
            var $input = $(this);
            if (!$input.data('iconpicker')) {
                var options = {};
                
                // Input bir modal içindeyse
                if ($input.closest('.modal').length > 0) {
                    options.modalMode = true;
                    options.zIndex = 1056;
                }
                
                // Input'un value değeri yoksa varsayılan ikonu koy
                if (!$input.val()) {
                    $input.val('fas fa-heart');
                }
                
                    // Plugin'i başlat
                $input.iconpicker(options);
                } else {
                    // Zaten başlatılmış bir plugin var, önizleme ikonunu kontrol et ve güncelle
                    var iconpickerInstance = $input.data('iconpicker');
                    if (iconpickerInstance && typeof iconpickerInstance._updatePreviewIcon === 'function') {
                        iconpickerInstance._updatePreviewIcon();
                    }
                }
            });
        }, 100); // Sayfanın tamamen yüklenmesi için kısa bir gecikme
        
        // Modal gösterildiğinde, içindeki icon-picker inputları otomatik başlat
        $(document).on('shown.bs.modal', '.modal', function() {
            var $modal = $(this);
            $modal.find('.icon-picker, .iconpicker').each(function() {
                var $input = $(this);
                if (!$input.data('iconpicker')) {
                    var options = {
                        modalMode: true,
                        zIndex: 1056
                    };
                    
                    // Input'un value değeri yoksa varsayılan ikonu koy
                    if (!$input.val()) {
                        $input.val('fas fa-heart');
                    }
                    
                    // Plugin'i başlat
                    $input.iconpicker(options);
                } else {
                    // Zaten başlatılmış bir plugin var, önizleme ikonunu kontrol et ve güncelle
                    var iconpickerInstance = $input.data('iconpicker');
                    if (iconpickerInstance && typeof iconpickerInstance._updatePreviewIcon === 'function') {
                        iconpickerInstance._updatePreviewIcon();
                    }
                }
            });
        });
    });

})(jQuery); 
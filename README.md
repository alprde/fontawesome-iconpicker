# IconPicker

*Bu jQuery tabanlı icon picker kütüphanesi, yapay zeka yardımıyla oluşturulmuştur.*

Bootstrap 5.3.3 ve Font Awesome 5 uyumlu, şık ve modern bir ikon seçici bileşeni. Basit kullanım, özelleştirilebilir seçenekler ve geniş ikon seçenekleri sunar.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.3-purple.svg)
![Font Awesome](https://img.shields.io/badge/Font_Awesome-5.15.4-green.svg)
![jQuery](https://img.shields.io/badge/jQuery-3.6.0-orange.svg)

## Özellikler

- Bootstrap 5.3.3 uyumlu tasarım
- Font Awesome 5 ikonları (Solid, Regular ve Brands kategorileri)
- Arama fonksiyonu ile hızlı ikon bulma
- Kategori filtreleme
- Dropdown ve inline kullanım modları
- Modal içinde kullanım desteği
- Mobil dokunmatik cihaz desteği
- Karanlık tema desteği
- Tamamen özelleştirilebilir
- jQuery bağımlılığıyla kolay entegrasyon
- Programatik olarak ikon değiştirme ve yönetim API'si

## Kurulum

Gerekli CSS ve JavaScript dosyalarını projenize ekleyin:

```html
<!-- CSS Dosyaları -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
<link href="css/iconpicker.css" rel="stylesheet">

<!-- JavaScript Dosyaları -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="js/iconset/iconset-fontawesome-5-all.js"></script>
<script src="js/iconpicker.js"></script>
```

## Temel Kullanım

IconPicker'ı bir input alanına bağlamak için:

```html
<div class="input-group">
    <input type="text" class="form-control iconpicker" name="icon" value="fas fa-heart">
</div>
```

```javascript
$('.iconpicker').iconpicker();
```

## Ayarlar

IconPicker birçok özelleştirme seçeneği sunar:

```javascript
$('.iconpicker').iconpicker({
    title: 'İkon Seçici',             // Başlık
    selectedIcon: 'fas fa-heart',     // Varsayılan seçili ikon
    defaultCategory: 'solid',         // Varsayılan kategori
    height: 280,                      // Picker yüksekliği (px)
    hideOnSelect: true,               // Seçimden sonra gizle
    showFooter: true,                 // Alt bilgi göster/gizle
    searchText: 'İkon Ara...',        // Arama kutucuğu metni
    noResultsText: 'Sonuç bulunamadı',// Sonuç bulunamadığında gösterilecek metin
    borderRadius: '.375rem',          // Köşe yuvarlaklığı
    backdropOpacity: 0.7,             // Arkaplan opaklığı
    placement: 'bottom',              // Yerleşim (top/bottom)
    modalMode: false,                 // Modal içinde kullanım
    zIndex: 1040,                     // z-index değeri
    inlineMode: false                 // Inline mod
});
```

## Gelişmiş Kullanım Örnekleri

### Modal İçinde Kullanım

Modal içinde kullanıldığında, `modalMode: true` ayarı ile daha iyi bir deneyim sunabilirsiniz:

```javascript
$('.iconpicker-in-modal').iconpicker({
    modalMode: true
});
```

### Inline Mod

Dropdown yerine sabit bir liste olarak göstermek için:

```javascript
$('.iconpicker-inline').iconpicker({
    inlineMode: true
});
```

### Olayları Dinleme

İkon seçimi sırasında özel olayları dinlemek için:

```javascript
$('.iconpicker').iconpicker()
.on('change', function(e) {
    console.log('Seçilen ikon:', e.target.value);
})
.on('shown.iconpicker', function(e) {
    console.log('IconPicker açıldı');
})
.on('hidden.iconpicker', function(e) {
    console.log('IconPicker kapandı');
})
.on('selected.iconpicker', function(e, iconClass) {
    console.log('Seçilen ikon:', iconClass);
});
```

### Programatik Kullanım

İkon seçicinizi kodla kontrol etmek için:

```javascript
// Dropdown'ı göster
$('.iconpicker').data('iconpicker').showDropdown();

// Dropdown'ı gizle
$('.iconpicker').data('iconpicker').hideDropdown();

// İkon seç
$('.iconpicker').data('iconpicker').selectIcon('fas fa-check');

// Programsal olarak ikonu değiştir
$('.iconpicker').data('iconpicker').setIcon('fas fa-star');
```

## Tarayıcı Uyumluluğu

- Chrome (son sürüm)
- Firefox (son sürüm)
- Safari (son sürüm)
- Edge (son sürüm)
- Opera (son sürüm)
- iOS Safari
- Android Chrome

## Mobil ve Dokunmatik Destek

IconPicker, mobil cihazlar ve dokunmatik ekranlar için optimize edilmiştir, doğru font boyutları ve dokunmatik hedef boyutları ile kullanım kolaylığı sağlar.

## Bağımlılıklar

- jQuery 3.6.0+
- Bootstrap 5.3.3+
- Font Awesome 5.15.4+

## Lisans

MIT Lisansı altında yayınlanmıştır.

## Katkıda Bulunma

1. Bu repo'yu fork edin
2. Özellik dalınızı oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Dalınıza push yapın (`git push origin feature/amazing-feature`)
5. Bir Pull Request oluşturun

## İletişim

GitHub: [github.com/alprde/fontawesome-iconpicker](https://github.com/alprde/fontawesome-iconpicker) 
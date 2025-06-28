(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()


//for show.ejs
    (() => {
        'use strict'
        const forms = document.querySelectorAll('.needs-validation')
        Array.from(forms).forEach(form => {
            form.addEventListener('submit', event => {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                form.classList.add('was-validated')
            }, false)
        })
    })()

// Search functionality enhancements
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('input[name="search"]');
    const searchForm = document.querySelector('form[action="/listings"]');
    
    if (searchInput && searchForm) {
        // Add search suggestions on focus
        searchInput.addEventListener('focus', function() {
            this.placeholder = 'Try: "Mountain", "Beach", "City" or location name';
        });
        
        searchInput.addEventListener('blur', function() {
            this.placeholder = 'Search Destination';
        });
        
        // Add keyboard shortcut (Ctrl/Cmd + K) to focus search
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });
        
        // Add search on Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchForm.submit();
            }
        });
        
        // Add loading state to search button
        searchForm.addEventListener('submit', function() {
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) {
                searchBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i><span>Searching...</span>';
                searchBtn.disabled = true;
            }
        });
    }
});

// Image removal checkbox functionality
document.addEventListener('DOMContentLoaded', function() {
    const removeImageCheckbox = document.getElementById('removeImage');
    const imageFileInput = document.querySelector('input[type="file"]');
    
    if (removeImageCheckbox && imageFileInput) {
        removeImageCheckbox.addEventListener('change', function() {
            if (this.checked) {
                imageFileInput.disabled = true;
                imageFileInput.style.opacity = '0.5';
            } else {
                imageFileInput.disabled = false;
                imageFileInput.style.opacity = '1';
            }
        });
    }
});

// Form validation
(function() {
    'use strict';
    window.addEventListener('load', function() {
        var forms = document.getElementsByClassName('needs-validation');
        var validation = Array.prototype.filter.call(forms, function(form) {
            form.addEventListener('submit', function(event) {
                if (form.checkValidity() === false) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    }, false);
})();

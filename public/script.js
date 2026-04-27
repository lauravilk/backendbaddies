function confirmDelete(button) {
    if (confirm("Haluatko varmasti poistaa elokuvan?")) {
        button.form.submit();
    }
};


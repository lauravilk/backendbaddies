function confirmDelete(button) {
    if (confirm("Are you sure you want to delete this movie?")) {
        button.form.submit();
        alert("Movie has been deleted.");
    }
};

